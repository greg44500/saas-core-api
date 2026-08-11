/**
 * Permissions transversales actuellement nécessaires au socle SaaS.
 *
 * Chaque permission représente une action précise dans un workspace.
 * Les futures applications métier pourront étendre ce registre avec leurs
 * propres permissions sans modifier celles du socle.
 */
const CORE_PERMISSION = Object.freeze({
    // Consultation et modification des informations courantes du workspace.
    WORKSPACE_READ: 'workspace:read',
    WORKSPACE_UPDATE: 'workspace:update',

    // Consultation et administration des appartenances au workspace.
    MEMBER_READ: 'member:read',
    MEMBER_UPDATE: 'member:update',
    MEMBER_SUSPEND: 'member:suspend',
    MEMBER_REMOVE: 'member:remove',

    // Consultation et administration des rôles du workspace.
    ROLE_READ: 'role:read',
    ROLE_CREATE: 'role:create',
    ROLE_UPDATE: 'role:update',
    ROLE_DELETE: 'role:delete',
});


export { CORE_PERMISSION };