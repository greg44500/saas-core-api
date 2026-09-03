import {
    PLATFORM_ROLE,
} from './platformRoles.constants.js';


/**
 * Permissions génériques du périmètre Platform.
 *
 * Elles décrivent des actions administratives réelles. Il n'existe
 * volontairement aucune permission `feature:create` ou `feature:update` :
 * les capabilities sont déclarées par le code de l'application et restent en
 * lecture seule depuis l'administration.
 */
const PLATFORM_PERMISSION = Object.freeze({
    OVERVIEW_READ: 'platform:overview:read',

    CAPABILITIES_READ: 'platform:capabilities:read',

    PLANS_READ: 'platform:plans:read',
    PLANS_CREATE: 'platform:plans:create',
    PLANS_UPDATE: 'platform:plans:update',
    PLANS_ARCHIVE: 'platform:plans:archive',

    SUBSCRIPTIONS_READ: 'platform:subscriptions:read',
    SUBSCRIPTIONS_UPDATE: 'platform:subscriptions:update',

    ENTITLEMENT_OVERRIDES_READ:
        'platform:entitlement_overrides:read',
    ENTITLEMENT_OVERRIDES_CREATE:
        'platform:entitlement_overrides:create',
    ENTITLEMENT_OVERRIDES_UPDATE:
        'platform:entitlement_overrides:update',
    ENTITLEMENT_OVERRIDES_REVOKE:
        'platform:entitlement_overrides:revoke',

    USERS_READ: 'platform:users:read',
    USERS_UPDATE: 'platform:users:update',

    WORKSPACES_READ: 'platform:workspaces:read',
    WORKSPACES_UPDATE: 'platform:workspaces:update',

    AUDIT_LOGS_READ: 'platform:audit_logs:read',
});

const PLATFORM_PERMISSIONS = Object.freeze(
    Object.values(PLATFORM_PERMISSION),
);

/**
 * Politique Core V1 : aucun élargissement implicite des rôles existants.
 *
 * `super_admin` conserve l'ensemble des droits Platform. `admin`, `support`
 * et `user` restent sans permission Platform granulaire tant qu'une politique
 * produit explicite ne leur en attribue pas. Cette table pourra être remplacée
 * par une politique plus fine sans modifier les routes consommatrices.
 */
const DEFAULT_PLATFORM_ROLE_PERMISSIONS = Object.freeze({
    [PLATFORM_ROLE.USER]: Object.freeze([]),
    [PLATFORM_ROLE.SUPPORT]: Object.freeze([]),
    [PLATFORM_ROLE.ADMIN]: Object.freeze([]),
    [PLATFORM_ROLE.SUPER_ADMIN]: PLATFORM_PERMISSIONS,
});


export {
    DEFAULT_PLATFORM_ROLE_PERMISSIONS,
    PLATFORM_PERMISSION,
    PLATFORM_PERMISSIONS,
};
