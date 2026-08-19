import {
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
} from './planCapability.registry.js';

import {
    AppError,
} from '../../utils/appError.js';


/**
 * Vérifie qu'un plan contient une fonctionnalité donnée.
 *
 * Cette règle appartient à la couche service et non au middleware :
 * - le middleware l'utilise comme barrière HTTP avant Multer ;
 * - la future transaction File l'utilisera une seconde fois avec le plan
 *   relu dans la session MongoDB.
 *
 * Le registre est injectable afin de rester compatible avec les
 * fonctionnalités ajoutées par une application métier.
 */
const assertPlanFeatureAvailable = ({
    plan,
    featureKey,
    registry =
        DEFAULT_PLAN_CAPABILITY_REGISTRY,
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

    /*
     * Une clé inconnue révèle une erreur de programmation ou un module métier
     * qui n'a pas enregistré sa capability. Elle ne doit pas être confondue
     * avec une fonctionnalité valide mais absente d'un plan particulier.
     */
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