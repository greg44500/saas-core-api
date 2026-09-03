import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    hasConsumedTrial,
} from '../../trialEligibility/trialEligibility.service.js';
import { Subscription } from '../subscription.model.js';
import {
    getWorkspaceAccessEntitlement,
} from '../subscription.service.js';
import {
    resolveCurrentWorkspaceOwner,
} from './grantTrial.helpers.js';

/**
 * Transforme un Plan en contrat de lecture destiné au frontend.
 *
 * La projection est volontairement explicite : un nouveau champ ajouté au
 * modèle MongoDB ne doit jamais devenir publiquement lisible par accident.
 */
const serializePlan = (plan) => {
    if (!plan) {
        return null;
    }

    const limits = plan.limits instanceof Map
        ? Object.fromEntries(plan.limits)
        : { ...(plan.limits ?? {}) };

    return {
        id: plan._id.toString(),
        key: plan.key,
        name: plan.name,
        features: [...(plan.features ?? [])],
        limits,
    };
};

/**
 * Transforme une Subscription en état contractuel opérationnel.
 *
 * Les montants, moyens de paiement, identifiants provider, réductions et
 * informations de facturation sont volontairement absents. Ils appartiennent
 * au futur domaine Billing, dont l'accès sera réservé au propriétaire du
 * workspace (ou au représentant de l'organisation propriétaire lorsqu'un tel
 * modèle existera).
 */
const serializeSubscription = (subscription) => {
    if (!subscription) {
        return null;
    }

    const scheduledChange = subscription.scheduledChange
        ? {
            type: subscription.scheduledChange.type,
            targetPlan: serializePlan(
                subscription.scheduledChange.targetPlan,
            ),
            targetBillingInterval:
                subscription.scheduledChange.targetBillingInterval,
            effectiveAt: subscription.scheduledChange.effectiveAt,
            requestedAt: subscription.scheduledChange.requestedAt,
        }
        : null;

    return {
        id: subscription._id.toString(),
        kind: subscription.kind,
        status: subscription.status,
        plan: serializePlan(subscription.plan),
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        billingInterval: subscription.billingInterval,
        scheduledChange,
    };
};

/**
 * Construit la vue Workspace des droits réellement applicables.
 *
 * `effectiveCapabilities` contient aussi, côté domaine, les overrides ayant
 * participé au calcul. Cette projection ne les propage volontairement jamais :
 * source commerciale, motif, auteur Platform et identifiants d'override sont
 * des données d'administration et non des droits nécessaires au Workspace.
 *
 * Le Plan reste exposé comme contexte contractuel historique. Pour toute
 * décision runtime ou tout affichage intitulé "effectif", les consommateurs
 * doivent utiliser `features` et `limits` situés directement sur
 * `effectiveEntitlement`, jamais `effectiveEntitlement.plan.features/limits`.
 */
const serializeWorkspaceEffectiveEntitlement = (access) => {
    if (
        !access?.subscription
        || !access?.plan
        || !access?.effectiveCapabilities
        || !Array.isArray(
            access.effectiveCapabilities.features,
        )
    ) {
        throw new TypeError(
            'Workspace effective entitlement is incomplete.',
        );
    }

    const rawLimits = access.effectiveCapabilities.limits;

    if (
        rawLimits === null
        || typeof rawLimits !== 'object'
        || Array.isArray(rawLimits)
    ) {
        throw new TypeError(
            'Workspace effective entitlement limits are invalid.',
        );
    }

    const limits = rawLimits instanceof Map
        ? Object.fromEntries(rawLimits)
        : { ...rawLimits };

    return {
        plan: serializePlan(access.plan),
        features: [
            ...access.effectiveCapabilities.features,
        ],
        limits,
        subscriptionKind: access.subscription.kind,
        subscriptionStatus: access.subscription.status,
        accessMode: access.accessMode,
        reason: access.reason,
        blockingLimits: access.blockingLimits,
        nonBlockingLimits: access.nonBlockingLimits,
    };
};

/**
 * Retourne la vue de lecture consolidée de l'abonnement d'un workspace.
 *
 * Subscription reste l'autorité contractuelle et
 * getWorkspaceAccessEntitlement reste l'autorité des droits effectifs. Le
 * frontend reçoit donc un DTO prêt à consommer et ne doit jamais reconstruire
 * lui-même le fallback commercial -> Free, les overrides ni le mode de
 * remédiation.
 *
 * L'état de consommation du trial est également résolu côté serveur à partir
 * de l'owner actuel. Le frontend peut ainsi éviter de proposer un nouveau trial
 * lorsque l'identité l'a déjà consommé, sans jamais recevoir son empreinte HMAC.
 */
const getWorkspaceSubscriptionOverview = async ({
    workspaceId,
    session,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to read workspace subscription overview',
        );
    }

    const buildQuery = (filter) => {
        let query = Subscription.findOne({
            workspace: workspaceId,
            ...filter,
        })
            .populate({
                path: 'plan',
            })
            .populate({
                path: 'scheduledChange.targetPlan',
            });

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    const baselineQuery = buildQuery({
        kind: SUBSCRIPTION_KIND.BASELINE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
    });

    const commercialQuery = buildQuery({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
    }).sort({
        createdAt: -1,
    });

    let baseline;
    let commercial;
    let access;
    let owner;

    if (session) {
        /*
         * Le pilote MongoDB ne garantit pas les opérations parallèles dans une
         * même transaction. Une session fournie impose donc des lectures
         * séquentielles, tandis que le chemin HTTP ordinaire reste parallélisé.
         */
        baseline = await baselineQuery;
        commercial = await commercialQuery;
        access = await getWorkspaceAccessEntitlement({
            workspaceId,
            session,
        });
        owner = await resolveCurrentWorkspaceOwner({
            workspaceId,
            session,
        });
    } else {
        [baseline, commercial, access, owner] = await Promise.all([
            baselineQuery,
            commercialQuery,
            getWorkspaceAccessEntitlement({
                workspaceId,
                session: null,
            }),
            resolveCurrentWorkspaceOwner({
                workspaceId,
                session: null,
            }),
        ]);
    }

    const trialConsumed = await hasConsumedTrial({
        emailCanonical: owner.emailCanonical,
        session: session ?? null,
    });

    return {
        baseline: serializeSubscription(baseline),
        commercial: serializeSubscription(commercial),
        effectiveEntitlement:
            serializeWorkspaceEffectiveEntitlement(access),
        trialEligibility: {
            consumed: trialConsumed,
        },
    };
};

export {
    getWorkspaceSubscriptionOverview,
    serializePlan,
    serializeSubscription,
    serializeWorkspaceEffectiveEntitlement,
};