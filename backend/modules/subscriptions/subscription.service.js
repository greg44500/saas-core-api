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
 * Le nom commercial du plan est libre. Le backend s'appuie sur son rôle
 * système `baseline`, avec un fallback sur l'ancienne clé `free` uniquement
 * pour permettre une transition sûre des bases existantes avant migration.
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
        $or: [
            { systemRole: PLAN_SYSTEM_ROLE.BASELINE },
            { key: PLAN_KEY.FREE },
        ],
    }).session(session);

    if (!baselinePlan) {
        throw new AppError(
            'Le plan baseline actif est introuvable. Exécutez le seed et la migration des plans.',
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
