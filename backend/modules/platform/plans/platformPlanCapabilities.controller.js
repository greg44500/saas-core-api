import {
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
} from '../../plan/planCapability.registry.js';

/**
 * Expose le registre actif des capabilities au super-admin sans dupliquer
 * ses clés dans le frontend. Les services Plan restent l'autorité de
 * validation lors des créations et modifications de plans.
 */
const listPlanCapabilities = async (req, res) => {
    const features = Array.from(
        DEFAULT_PLAN_CAPABILITY_REGISTRY.features,
    ).sort();

    const metrics = Array.from(
        DEFAULT_PLAN_CAPABILITY_REGISTRY.metrics,
    )
        .sort()
        .map((key) => ({
            key,
            definition:
                DEFAULT_PLAN_CAPABILITY_REGISTRY
                    .getMetricDefinition(key),
        }));

    return res.status(200).json({
        status: 'success',
        data: {
            features,
            metrics,
        },
    });
};

export {
    listPlanCapabilities,
};
