import {
    getNextEntitlementChangeAt,
} from '../entitlementOverride/entitlementOverrideSchedule.service.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../subscriptions/subscription.service.js';

/**
 * Expose uniquement les clés de features réellement applicables au workspace.
 *
 * Cette projection est destinée à la composition de l'UI tenant. Les sources,
 * motifs et identifiants d'override restent strictement réservés à Platform.
 * Le backend conserve l'autorité de sécurité sur chaque route protégée.
 */
const getWorkspaceEffectiveFeatures = async ({ workspaceId }) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to read workspace effective features',
        );
    }

    const entitlement = await getWorkspaceEffectiveEntitlement({
        workspaceId,
    });

    return [
        ...entitlement.effectiveCapabilities.features,
    ];
};

/**
 * Construit la vue minimale nécessaire à l'UI tenant pour refléter les droits
 * commerciaux dynamiques sans exposer les détails administratifs d'override.
 *
 * La prochaine échéance permet au navigateur de refetch au bon moment. Elle ne
 * constitue pas une autorisation et ne remplace jamais les contrôles backend.
 */
const getWorkspaceEntitlementPresentation = async ({
    workspaceId,
    at = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to read workspace entitlement presentation',
        );
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
        features: [
            ...entitlement.effectiveCapabilities.features,
        ],
        nextEntitlementChangeAt,
    };
};

export {
    getWorkspaceEffectiveFeatures,
    getWorkspaceEntitlementPresentation,
};
