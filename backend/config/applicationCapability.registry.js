import {
    composePlanCapabilityExtensions,
    createPlanCapabilityRegistry,
} from '../modules/plan/planCapability.registry.js';


/**
 * Point de composition unique des capabilities de l'application.
 *
 * Le Core reste volontairement vide de capabilities métier. Après clonage,
 * l'application dérivée importe ici les descriptors de ses modules métier puis
 * les ajoute à cette liste. Aucun `.env` n'est requis : une capability existe
 * parce que le code correspondant est réellement embarqué dans l'application.
 *
 * Exemple après clonage :
 *
 * import { productPlanCapabilities }
 *     from '../modules/products/productPlanCapabilities.js';
 *
 * const APPLICATION_PLAN_CAPABILITY_MODULES = Object.freeze([
 *     productPlanCapabilities,
 * ]);
 */
const APPLICATION_PLAN_CAPABILITY_MODULES = Object.freeze([]);

const ACTIVE_PLAN_CAPABILITY_REGISTRY = createPlanCapabilityRegistry(
    composePlanCapabilityExtensions(
        APPLICATION_PLAN_CAPABILITY_MODULES,
    ),
);


export {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
    APPLICATION_PLAN_CAPABILITY_MODULES,
};
