import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    isBaselinePlan,
} from '../../plan/plan.service.js';
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

const serializePlan = (plan) => {
    if (!plan) {
        return null;
    }

    const limits = plan.limits instanceof Map
        ? Object.fromEntries(plan.limits)
        : { ...(plan.limits ?? {}) };

    return {
        id: plan._id.toString(),
        isBaseline: isBaselinePlan(plan),
        name: plan.name,
        features: [...(plan.features ?? [])],
        limits,
    };
};

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
