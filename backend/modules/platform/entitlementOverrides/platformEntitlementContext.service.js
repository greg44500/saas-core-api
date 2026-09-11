import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../../config/applicationCapability.registry.js';
import {
    getNextEntitlementChangeAt,
} from '../../entitlementOverride/entitlementOverrideSchedule.service.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../subscriptions/subscription.service.js';
import {
    getUsageMetricValue,
} from '../../usageMetric/usageMetric.service.js';
import { Workspace } from '../../workspace/workspace.model.js';
import { AppError } from '../../../utils/appError.js';


const toLimitsObject = (limits) => limits instanceof Map
    ? Object.fromEntries(limits)
    : { ...(limits ?? {}) };

const serializeAppliedOverride = (override) => ({
    id: override.id,
    targetType: override.targetType,
    featureKey: override.featureKey ?? null,
    metricKey: override.metricKey ?? null,
    featureEnabled: override.featureEnabled ?? null,
    limitValue: override.limitValue ?? null,
    startsAt: override.startsAt,
    endsAt: override.endsAt ?? null,
});

const getWorkspaceUsageSnapshot = async ({ workspaceId, at }) => {
    const metricKeys = [...ACTIVE_PLAN_CAPABILITY_REGISTRY.metrics];
    const values = await Promise.all(
        metricKeys.map(async (metricKey) => [
            metricKey,
            await getUsageMetricValue({
                workspaceId,
                metricKey,
                at,
            }),
        ]),
    );

    return Object.fromEntries(values);
};

/**
 * Vue Platform permettant d'expliquer l'entitlement réellement applicable.
 *
 * Le Plan reste la référence commerciale normale. `effective` représente le
 * résultat après composition des overrides actifs. `usage` expose la mesure
 * courante de chaque métrique afin qu'une dérogation Platform ne puisse pas
 * accorder une fonctionnalité avec un quota déjà saturé.
 *
 * Les identifiants d'override sont exposés uniquement ici afin qu'un retour au
 * Plan puisse révoquer l'exception responsable au lieu d'empiler une exception
 * inverse. Le contexte reste réservé aux permissions Platform.
 */
const getPlatformEntitlementContext = async ({
    workspaceId,
    at = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to get platform entitlement context',
        );
    }

    const workspace = await Workspace.findById(workspaceId)
        .select('_id name')
        .lean();

    if (!workspace) {
        throw new AppError('Workspace introuvable.', 404);
    }

    const [
        entitlement,
        nextEntitlementChangeAt,
        usage,
    ] = await Promise.all([
        getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
        }),
        getNextEntitlementChangeAt({
            workspaceId,
            at,
        }),
        getWorkspaceUsageSnapshot({
            workspaceId,
            at,
        }),
    ]);

    return {
        workspace: {
            id: workspace._id.toString(),
            name: workspace.name,
        },
        plan: {
            id: entitlement.plan._id.toString(),
            name: entitlement.plan.name,
            features: [...(entitlement.plan.features ?? [])],
            limits: toLimitsObject(entitlement.plan.limits),
        },
        effective: {
            features: [...entitlement.effectiveCapabilities.features],
            limits: {
                ...entitlement.effectiveCapabilities.limits,
            },
        },
        usage,
        appliedOverrides:
            entitlement.effectiveCapabilities.appliedOverrides
                .map(serializeAppliedOverride),
        nextEntitlementChangeAt,
    };
};


export { getPlatformEntitlementContext };
