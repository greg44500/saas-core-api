import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';

import {
    AppError,
} from '../../utils/appError.js';


/**
 * Vérifie qu'un plan contient une fonctionnalité donnée.
 *
 * Le registre par défaut est le registre actif de l'application. Une future
 * application métier peut donc déclarer une feature dans son point de
 * composition sans modifier ce service Core.
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

    if (
        typeof featureKey !== 'string'
        || featureKey.length === 0
    ) {
        throw new TypeError(
            'featureKey is required to enforce a plan feature',
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


export { assertPlanFeatureAvailable };
