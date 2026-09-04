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

export { getWorkspaceEffectiveFeatures };
