import {
    composeRetentionTargetExtensions,
    createRetentionTargetRegistry,
} from '../modules/retention/retentionTarget.registry.js';


/**
 * Point de composition unique des cibles de rétention de l'application.
 *
 * Un SaaS dérivé peut déclarer ici des targets supplémentaires dont le code et
 * les adapters existent réellement. Une configuration runtime ne peut jamais
 * créer une cible absente de ce registre.
 */
const APPLICATION_RETENTION_TARGET_MODULES = Object.freeze([]);

const ACTIVE_RETENTION_TARGET_REGISTRY =
    createRetentionTargetRegistry({
        targets: composeRetentionTargetExtensions(
            APPLICATION_RETENTION_TARGET_MODULES,
        ),
    });


export {
    ACTIVE_RETENTION_TARGET_REGISTRY,
    APPLICATION_RETENTION_TARGET_MODULES,
};
