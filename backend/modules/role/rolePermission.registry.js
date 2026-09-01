import { CORE_PERMISSION } from '../../constants/permissions.constants.js';

/**
 * Point d'extension unique du registre des permissions attribuables aux rôles.
 * Les futures applications métier pourront enrichir ce registre sans déplacer
 * la validation d'autorisation dans les controllers ou le frontend.
 */
const ACTIVE_ROLE_PERMISSIONS = Object.freeze([
    ...Object.values(CORE_PERMISSION),
]);

const RESERVED_CUSTOM_ROLE_PERMISSIONS = Object.freeze([
    CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
]);

export {
    ACTIVE_ROLE_PERMISSIONS,
    RESERVED_CUSTOM_ROLE_PERMISSIONS,
};
