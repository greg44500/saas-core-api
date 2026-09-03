import mongoose from 'mongoose';
import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
} from '../../constants/subscription.constants.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
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
 * Crée la souscription gratuite initiale d'un nouveau workspace.
 *
 * Cette opération participe à la transaction de création du workspace.
 * La session MongoDB est donc obligatoire : le workspace ne doit pas être
 * conservé si sa souscription initiale ne peut pas être créée.
 *
 * Le plan Free constitue la baseline durable du workspace. Un futur trial ou
 * abonnement payant est représenté par une souscription `commercial` séparée :
 * la baseline Free n'est donc ni remplacée ni supprimée lorsqu'un trial est
 * accordé.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId} params.workspaceId
 * @param {import('mongoose').Types.ObjectId} params.actorId
 * @param {import('mongoose').ClientSession} params.session
 * @returns {Promise<import('mongoose').Document>}
 */
const createFreeSubscriptionForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create a free subscription',
        );
    }

    const freePlan = await Plan.findOne({
        key: PLAN_KEY.FREE,
        status: PLAN_STATUS.ACTIVE,
    }).session(session);

    if (!freePlan) {
        throw new AppError(
            'Le plan gratuit actif est introuvable. Exécutez le seed des plans.',
            500,
        );
    }

    const currentPeriodStart = new Date();

    const [subscription] = await Subscription.create(
        [
            {
                workspace: workspaceId,
                plan: freePlan._id,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodStart,
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: BILLING_INTERVAL.NONE,
                currency: freePlan.currency,
                priceExclTaxMinor:
                    freePlan.priceMonthlyExclTaxMinor,
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
 * Récupère la souscription utilisable et le Plan catalogue applicable à un
 * Workspace pour un instant de référence donné.
 *
 * Les bornes temporelles sont les autorités métier pour l'accès commercial :
 * un statut `trialing` ou `active` resté temporairement en base après son
 * échéance ne doit jamais prolonger les droits payants.
 *
 * Le paramètre `at` permet aux couches supérieures de résoudre Subscription,
 * EntitlementOverride et UsageMetric sur la même horloge. Sans lui, des droits
 * proches d'une échéance pourraient être calculés depuis deux instants
 * différents au sein d'une même décision.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {Date} [params.at]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<{
 *     subscription: import('mongoose').Document,
 *     plan: import('mongoose').Document
 * }>}
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
        currentPeriodEnd: mongoose.trusted({
            $type: 'date',
            $gt: at,
        }),
    });

    if (!commercialSubscription) {
        commercialSubscription = await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
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
 * Résout l'entitlement commercial complet d'un Workspace sans modifier les
 * documents persistés qui le composent.
 *
 * La Subscription choisit d'abord le Plan catalogue applicable. Les overrides
 * actifs au même instant sont ensuite appliqués sur une copie des capabilities
 * du Plan. Le registre actif de l'application est transmis aux deux étapes afin
 * qu'une application clonée bénéficie exactement du même moteur que le Core.
 *
 * Les lectures restent séquentielles lorsqu'une session MongoDB est fournie :
 * cette fonction peut être appelée depuis une transaction et ne doit pas
 * introduire d'opérations concurrentes sur une même session.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {Date} [params.at]
 * @param {{features: Set<string>, metrics: Set<string>}} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<{
 *     subscription: import('mongoose').Document,
 *     plan: import('mongoose').Document,
 *     at: Date,
 *     effectiveCapabilities: {
 *         features: string[],
 *         limits: Record<string, number|null>,
 *         appliedOverrides: object[]
 *     }
 * }>}
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
 * Résout le mode d'accès courant du Workspace à partir de l'entitlement
 * commercial effectif et de son utilisation réelle.
 *
 * La remédiation doit suivre la même décision commerciale que les écritures :
 * une réduction de limite par override peut donc placer le Workspace en
 * remédiation, tandis qu'une augmentation ou une limite illimitée peut l'en
 * sortir. Le Plan catalogue reste présent uniquement comme contexte et n'est
 * plus l'autorité des limites runtime.
 *
 * L'état n'est pas persisté : dès que les capacités bloquantes redeviennent
 * conformes, le prochain contrôle retourne automatiquement `normal`, sans job
 * ni action manuelle de déverrouillage.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @param {Date} [params.at]
 * @param {object} [params.registry]
 * @returns {Promise<object>}
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