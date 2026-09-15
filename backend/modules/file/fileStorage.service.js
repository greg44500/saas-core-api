import {
    getWorkspaceEffectiveEntitlement,
} from '../subscriptions/subscription.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    resolveEffectiveMetricLimit,
} from '../plan/planLimit.service.js';
import {
    getUsageMetricValue,
} from '../usageMetric/usageMetric.service.js';

/**
 * Retourne la consommation de stockage réellement comptabilisée par le Core.
 *
 * Le calcul ne somme jamais les seuls fichiers actifs : un fichier supprimé
 * continue de consommer du stockage jusqu'à sa purge physique. UsageMetric est
 * donc l'autorité pour la consommation, tandis que l'entitlement effectif est
 * l'autorité pour la limite appliquée au workspace.
 */
const getWorkspaceFileStorageUsage = async ({
    workspaceId,
    at = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to read file storage usage',
        );
    }

    const [effectiveEntitlement, usedBytes] = await Promise.all([
        getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
        }),
        getUsageMetricValue({
            workspaceId,
            metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
            at,
        }),
    ]);

    const limitBytes = resolveEffectiveMetricLimit({
        entitlement: effectiveEntitlement,
        metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
    });

    const unlimited = limitBytes === null;
    const remainingBytes = unlimited
        ? null
        : Math.max(limitBytes - usedBytes, 0);

    return {
        usedBytes,
        limitBytes,
        remainingBytes,
        unlimited,
        overLimit:
            !unlimited
            && usedBytes > limitBytes,
    };
};

export {
    getWorkspaceFileStorageUsage,
};
