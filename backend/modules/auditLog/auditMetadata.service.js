import {
    AUDIT_ACTION_REGISTRY,
    AUDIT_ENTITY_TYPE_REGISTRY,
    AUDIT_STATUS_REGISTRY,
} from '../../constants/auditActions.constants.js';


function registryToMetadata(registry) {
    return Object.values(registry).map(({ value, label }) => ({
        value,
        label,
    }));
}


/**
 * Retourne le vocabulaire Audit exposable aux interfaces clientes.
 *
 * La réponse est dérivée exclusivement du registre canonique backend. Le
 * frontend ne maintient donc aucune copie statique des actions, ressources ou
 * statuts supportés.
 */
function getAuditMetadata() {
    return {
        actions: registryToMetadata(AUDIT_ACTION_REGISTRY),
        entityTypes: registryToMetadata(AUDIT_ENTITY_TYPE_REGISTRY),
        statuses: registryToMetadata(AUDIT_STATUS_REGISTRY),
    };
}


export {
    getAuditMetadata,
    registryToMetadata,
};
