import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../../config/applicationCapability.registry.js';


/**
 * Expose le registre actif des capabilities au super-admin sans dupliquer
 * ses clés dans le frontend.
 *
 * `features` et `metrics` conservent le contrat historique. Les catalogues
 * enrichis apportent les métadonnées de présentation nécessaires au tri par
 * section sans transformer l'administration en éditeur de capabilities.
 */
const listPlanCapabilities = async (req, res) => {
    const features = Array.from(
        ACTIVE_PLAN_CAPABILITY_REGISTRY.features,
    ).sort();

    const metrics = Array.from(
        ACTIVE_PLAN_CAPABILITY_REGISTRY.metrics,
    )
        .sort()
        .map((key) => ({
            key,
            definition:
                ACTIVE_PLAN_CAPABILITY_REGISTRY
                    .getMetricDefinition(key),
            presentation:
                ACTIVE_PLAN_CAPABILITY_REGISTRY
                    .getMetricPresentation(key),
        }));

    return res.status(200).json({
        status: 'success',
        data: {
            features,
            featureDefinitions:
                ACTIVE_PLAN_CAPABILITY_REGISTRY
                    .listFeatureDefinitions(),
            metrics,
        },
    });
};

export {
    listPlanCapabilities,
};
