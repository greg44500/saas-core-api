import {
    getNextEntitlementChangeAt,
} from '../../entitlementOverride/entitlementOverrideSchedule.service.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../subscriptions/subscription.service.js';
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

/**
 * Vue Platform minimale permettant d'expliquer un entitlement effectif sans
 * exposer ce contexte administratif dans le DTO Workspace utilisateur.
 *
 * Le Plan reste la référence commerciale normale. `effective` représente le
 * résultat réellement applicable après composition des overrides actifs. Les
 * identifiants d'override sont exposés uniquement ici afin qu'un retour au Plan
 * puisse révoquer l'exception responsable au lieu d'empiler une exception
 * inverse.
 *
 * `nextEntitlementChangeAt` expose uniquement la prochaine borne temporelle
 * utile à l'UI. Elle permet un refetch ciblé sans exposer les motifs ou auteurs
 * des dérogations.
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

    const [entitlement, nextEntitlementChangeAt] = await Promise.all([
        getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
        }),
        getNextEntitlementChangeAt({
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
            key: entitlement.plan.key,
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
        appliedOverrides:
            entitlement.effectiveCapabilities.appliedOverrides
                .map(serializeAppliedOverride),
        nextEntitlementChangeAt,
    };
};


export { getPlatformEntitlementContext };
