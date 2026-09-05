import {
    PLATFORM_ROLE,
} from './platformRoles.constants.js';


/**
 * Niveaux de délégation des permissions Platform.
 *
 * Le niveau décrit la manière dont une permission peut être attribuée. Il ne
 * remplace jamais l'autorisation runtime elle-même.
 */
const PLATFORM_PERMISSION_SENSITIVITY = Object.freeze({
    DELEGABLE: 'delegable',
    SENSITIVE: 'sensitive',
    RESERVED: 'reserved',
});


/**
 * Permissions génériques du périmètre Platform.
 *
 * Les clés historiques trop larges sont temporairement conservées pour la
 * compatibilité des routes existantes. Les nouvelles routes doivent préférer
 * les permissions granulaires qui décrivent l'action réellement effectuée.
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
    SUBSCRIPTIONS_GRANT_TRIAL:
        'platform:subscriptions:grant_trial',
    SUBSCRIPTIONS_CANCEL: 'platform:subscriptions:cancel',
    SUBSCRIPTIONS_RESUME: 'platform:subscriptions:resume',

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
    USERS_DISABLE: 'platform:users:disable',
    USERS_ENABLE: 'platform:users:enable',
    USERS_REVOKE_SESSIONS:
        'platform:users:revoke_sessions',
    USERS_CLOSE: 'platform:users:close',

    WORKSPACES_READ: 'platform:workspaces:read',
    WORKSPACES_UPDATE: 'platform:workspaces:update',
    WORKSPACES_SUSPEND: 'platform:workspaces:suspend',
    WORKSPACES_REACTIVATE: 'platform:workspaces:reactivate',
    WORKSPACES_CLOSE: 'platform:workspaces:close',

    AUDIT_LOGS_READ: 'platform:audit_logs:read',

    TEAM_READ: 'platform:team:read',
    TEAM_INVITE: 'platform:team:invite',
    TEAM_INVITATION_RESEND:
        'platform:team:invitation_resend',
    TEAM_INVITATION_REVOKE:
        'platform:team:invitation_revoke',
    TEAM_MEMBER_ROLE_UPDATE:
        'platform:team:member_role_update',
    TEAM_MEMBER_SUSPEND:
        'platform:team:member_suspend',
    TEAM_MEMBER_REACTIVATE:
        'platform:team:member_reactivate',
    TEAM_MEMBER_REVOKE:
        'platform:team:member_revoke',

    ROLES_READ: 'platform:roles:read',
    ROLES_CREATE: 'platform:roles:create',
    ROLES_UPDATE: 'platform:roles:update',
    ROLES_ARCHIVE: 'platform:roles:archive',

    SUPER_ADMINS_MANAGE:
        'platform:super_admins:manage',
});

const PLATFORM_PERMISSIONS = Object.freeze(
    Object.values(PLATFORM_PERMISSION),
);

/**
 * Politique transitoire : aucun élargissement implicite des anciens rôles
 * stockés directement dans User.
 *
 * `super_admin` conserve tous les droits connus. `admin`, `support` et `user`
 * restent sans permission tant que PlatformTeamMember / PlatformRole ne sont
 * pas devenus l'autorité runtime dans A4.
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
    PLATFORM_PERMISSION_SENSITIVITY,
};
