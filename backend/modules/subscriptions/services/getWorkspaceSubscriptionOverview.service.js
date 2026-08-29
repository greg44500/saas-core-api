import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import { Subscription } from '../subscription.model.js';
import {
    getWorkspaceAccessEntitlement,
} from '../subscription.service.js';

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
 * Retourne la vue de lecture consolidée de l'abonnement d'un workspace.
 *
 * Subscription reste l'autorité contractuelle et
 * getWorkspaceAccessEntitlement reste l'autorité des droits effectifs. Le
 * frontend reçoit donc un DTO prêt à consommer et ne doit jamais reconstruire
 * lui-même le fallback commercial -> Free ni le mode de remédiation.
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

    const [baseline, commercial, access] = await Promise.all([
        baselineQuery,
        commercialQuery,
        getWorkspaceAccessEntitlement({
            workspaceId,
            session,
        }),
    ]);

    return {
        baseline: serializeSubscription(baseline),
        commercial: serializeSubscription(commercial),
        effectiveEntitlement: {
            plan: serializePlan(access.plan),
            subscriptionKind: access.subscription.kind,
            subscriptionStatus: access.subscription.status,
            accessMode: access.accessMode,
            reason: access.reason,
            blockingLimits: access.blockingLimits,
            nonBlockingLimits: access.nonBlockingLimits,
        },
    };
};

export {
    getWorkspaceSubscriptionOverview,
    serializePlan,
    serializeSubscription,
};