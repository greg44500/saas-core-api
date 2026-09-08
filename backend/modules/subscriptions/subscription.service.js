import mongoose from 'mongoose';
import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_TERM_TYPE,
} from '../../constants/subscription.constants.js';

import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import {
    WORKSPACE_ACCESS_MODE,
    WORKSPACE_ACCESS_REASON,
} from '../../constants/workspaceAccess.constants.js';

import {
    composeEffectiveEntitlementCapabilities,
} from '../entitlementOverride/effectiveEntitlement.service.js';
import {
    resolveActiveEntitlementOverrides,
} from '../entitlementOverride/entitlementOverride.service.js';
import { Plan } from '../plan/plan.model.js';
import {
    assessWorkspaceLimitsCompatibility,
} from '../plan/planCompatibility.service.js';
import { Subscription } from './subscription.model.js';

import { AppError } from '../../utils/appError.js';

const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

/**
 * Crée la souscription baseline initiale d'un nouveau workspace.
 *
 * Le nom commercial et la clé technique du plan sont sans influence : seul
 * son rôle système `baseline` permet de résoudre l'offre de référence. La
 * création exige une session MongoDB fournie par l'appelant afin de rester
 * atomique avec le workflow qui crée le workspace et ses autres ressources.
 *
 * Malgré son nom historique, cette fonction crée bien la baseline système et
 * ne dépend pas du nom commercial « Free ».
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {import('mongoose').ClientSession} params.session Session transactionnelle obligatoire.
 * @returns {Promise<object>} Document Subscription baseline créé.
 */
const createFreeSubscriptionForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create a baseline subscription',
        );
    }

    const baselinePlan = await Plan.findOne({
        status: PLAN_STATUS.ACTIVE,
        systemRole: PLAN_SYSTEM_ROLE.BASELINE,
    }).session(session);

    if (!baselinePlan) {
        throw new AppError(
            'Le plan baseline actif est introuvable. Exécutez le seed des plans.',
            500,
        );
    }

    const currentPeriodStart = new Date();

    const [subscription] = await Subscription.create(
        [
            {
                workspace: workspaceId,
                plan: baselinePlan._id,
                kind: SUBSCRIPTION_KIND.BASELINE,
                termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodStart,
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: BILLING_INTERVAL.NONE,
                currency: baselinePlan.currency,
                priceExclTaxMinor:
                    baselinePlan.priceMonthlyExclTaxMinor,
                provider: BILLING_PROVIDER.MANUAL,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ],
        {
            session,
        },
    );

    return subscription;
};

/**
 * Résout le couple Subscription/Plan qui fait autorité pour un workspace.
 *
 * Deux formes commerciales actives sont reconnues :
 * - `fixed`, dont `currentPeriodEnd` doit encore être dans le futur ;
 * - `open_ended`, strictement réservé ici à une offre gratuite, manuelle et
 *   sans périodicité ni échéance.
 *
 * Les anciennes subscriptions commerciales sans `termType` restent compatibles
 * uniquement avec le chemin historique `fixed` lorsqu'elles possèdent une
 * `currentPeriodEnd` future. Une valeur `open_ended` mal configurée ne peut donc
 * pas retomber silencieusement dans ce chemin et obtenir des droits permanents.
 *
 * La priorité reste : commerciale active, trial valide, puis baseline active.
 * Une subscription commerciale expirée ou incohérente ne masque jamais la
 * baseline de repli.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {Date} [params.at] Instant auquel résoudre la validité commerciale.
 * @param {import('mongoose').ClientSession} [params.session]
 * @returns {Promise<{subscription: object, plan: object}>}
 * Subscription retenue et plan peuplé correspondant.
 */
const getWorkspacePlanEntitlement = async ({
    workspaceId,
    at = new Date(),
    session,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve a workspace plan entitlement',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    const buildSubscriptionQuery = (filter) => {
        let query = Subscription.findOne({
            workspace: workspaceId,
            ...filter,
        }).populate({
            path: 'plan',
        });

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    let commercialSubscription = await buildSubscriptionQuery({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        billingInterval: BILLING_INTERVAL.NONE,
        priceExclTaxMinor: 0,
        provider: BILLING_PROVIDER.MANUAL,
    });

    if (!commercialSubscription) {
        commercialSubscription = await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            termType: mongoose.trusted({
                $ne: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
            }),
            currentPeriodEnd: mongoose.trusted({
                $type: 'date',
                $gt: at,
            }),
        });
    }

    if (!commercialSubscription) {
        commercialSubscription = await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            termType: mongoose.trusted({
                $ne: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
            }),
            trialEndsAt: mongoose.trusted({
                $type: 'date',
                $gt: at,
            }),
        });
    }

    const subscription = commercialSubscription
        ?? await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.BASELINE,
            status: SUBSCRIPTION_STATUS.ACTIVE,
        });

    if (!subscription) {
        throw new AppError(
            'Aucune souscription utilisable n’est associée à ce workspace.',
            403,
        );
    }

    if (!subscription.plan) {
        throw new AppError(
            'Le plan associé à la souscription est introuvable.',
            500,
        );
    }

    return {
        subscription,
        plan: subscription.plan,
    };
};

/**
 * Compose l'entitlement effectif d'un workspace à un instant donné.
 *
 * Le plan résolu reste la base contractuelle. Les dérogations actives sont
 * ensuite résolues séparément puis composées avec le registre de capabilities.
 * Cette fonction ne décide pas encore si les usages réels dépassent les limites
 * obtenues ; cette responsabilité appartient à `getWorkspaceAccessEntitlement`.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {Date} [params.at] Instant de résolution des périodes et dérogations.
 * @param {object} [params.registry] Registre de capabilities faisant autorité.
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<object>} Entitlement plan + overrides effectivement composés.
 */
const getWorkspaceEffectiveEntitlement = async ({
    workspaceId,
    at = new Date(),
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve workspace effective entitlement',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    const planEntitlement = await getWorkspacePlanEntitlement({
        workspaceId,
        at,
        session,
    });

    const activeOverrides = await resolveActiveEntitlementOverrides({
        workspaceId,
        at,
        registry,
        session,
    });

    const effectiveCapabilities =
        composeEffectiveEntitlementCapabilities({
            plan: planEntitlement.plan,
            activeOverrides,
            registry,
        });

    return {
        ...planEntitlement,
        at,
        effectiveCapabilities,
    };
};

/**
 * Résout l'entitlement utilisable par les contrôles d'accès du workspace.
 *
 * Après composition du plan et des dérogations, le service compare les limites
 * effectives aux usages réels. Un dépassement ne détruit pas l'entitlement : il
 * place le workspace en mode `remediation` et expose les limites bloquantes ou
 * non bloquantes afin que les middlewares et l'UI puissent appliquer le contrat
 * d'accès prévu par le Core.
 *
 * Cette fonction ne remplace ni l'authentification ni le RBAC. Elle qualifie
 * uniquement l'accès commercial/capacitaire à partir d'un workspace déjà connu.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @param {Date} [params.at] Instant de référence pour l'entitlement et les usages.
 * @param {object} [params.registry] Registre de capabilities faisant autorité.
 * @returns {Promise<object>} Entitlement effectif enrichi du mode d'accès.
 */
const getWorkspaceAccessEntitlement = async ({
    workspaceId,
    session = null,
    at = new Date(),
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve workspace access',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    const effectiveEntitlement =
        await getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
            registry,
            session,
        });

    const compatibility =
        await assessWorkspaceLimitsCompatibility({
            workspaceId,
            limits:
                effectiveEntitlement.effectiveCapabilities.limits,
            at,
            registry,
            session,
        });

    const accessMode = compatibility.compatible
        ? WORKSPACE_ACCESS_MODE.NORMAL
        : WORKSPACE_ACCESS_MODE.REMEDIATION;

    return {
        ...effectiveEntitlement,
        accessMode,
        reason: accessMode === WORKSPACE_ACCESS_MODE.REMEDIATION
            ? WORKSPACE_ACCESS_REASON.PLAN_LIMITS_EXCEEDED
            : null,
        blockingLimits: compatibility.blockingLimits,
        nonBlockingLimits: compatibility.nonBlockingLimits,
    };
};

export {
    createFreeSubscriptionForWorkspace,
    getWorkspaceAccessEntitlement,
    getWorkspaceEffectiveEntitlement,
    getWorkspacePlanEntitlement,
};
