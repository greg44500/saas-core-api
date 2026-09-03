import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';

import {
    AppError,
} from '../../utils/appError.js';


const assertRegisteredFeature = ({
    featureKey,
    registry,
}) => {
    if (
        typeof featureKey !== 'string'
        || featureKey.length === 0
    ) {
        throw new TypeError(
            'featureKey is required to enforce a feature',
        );
    }

    if (
        !registry
        || !(registry.features instanceof Set)
    ) {
        throw new TypeError(
            'registry must provide a feature Set',
        );
    }

    if (!registry.features.has(featureKey)) {
        throw new TypeError(
            `Unknown plan feature "${featureKey}"`,
        );
    }
};


/**
 * Vérifie qu'un Plan catalogue contient une fonctionnalité donnée.
 *
 * Cette primitive reste utile aux opérations qui travaillent volontairement
 * sur le catalogue. Les contrôles runtime d'un Workspace doivent utiliser
 * `assertEntitlementFeatureAvailable()` afin de prendre en compte les
 * EntitlementOverride actifs.
 */
const assertPlanFeatureAvailable = ({
    plan,
    featureKey,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (!plan) {
        throw new TypeError(
            'plan is required to enforce a plan feature',
        );
    }

    assertRegisteredFeature({
        featureKey,
        registry,
    });

    if (!Array.isArray(plan.features)) {
        throw new AppError(
            'Les fonctionnalités du plan sont indisponibles.',
            500,
        );
    }

    if (!plan.features.includes(featureKey)) {
        throw new AppError(
            'Cette fonctionnalité n’est pas incluse dans le plan du workspace.',
            403,
        );
    }

    return true;
};


/**
 * Vérifie une fonctionnalité dans l'entitlement commercial déjà composé.
 *
 * Le contrôle est volontairement distinct de `assertPlanFeatureAvailable` :
 * un override peut activer une feature absente du Plan ou, inversement,
 * retirer une feature normalement incluse. Le runtime ne doit donc jamais
 * reconstruire cette décision à partir du Plan catalogue.
 *
 * @param {object} params
 * @param {{
 *     effectiveCapabilities: {
 *         features: string[]
 *     }
 * }} params.entitlement
 * @param {string} params.featureKey
 * @param {{ features: Set<string> }} [params.registry]
 * @returns {true}
 */
const assertEntitlementFeatureAvailable = ({
    entitlement,
    featureKey,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (!entitlement?.effectiveCapabilities) {
        throw new TypeError(
            'effective entitlement is required to enforce a feature',
        );
    }

    assertRegisteredFeature({
        featureKey,
        registry,
    });

    const features = entitlement.effectiveCapabilities.features;

    if (!Array.isArray(features)) {
        throw new AppError(
            'Les fonctionnalités effectives du workspace sont indisponibles.',
            500,
        );
    }

    if (!features.includes(featureKey)) {
        throw new AppError(
            'Cette fonctionnalité n’est pas disponible pour ce workspace.',
            403,
        );
    }

    return true;
};


export {
    assertEntitlementFeatureAvailable,
    assertPlanFeatureAvailable,
};