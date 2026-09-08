import {
    PLATFORM_ROLE,
} from './platformRoles.constants.js';

const PLATFORM_PERMISSION_SENSITIVITY = Object.freeze({
    DELEGABLE: 'delegable',
    SENSITIVE: 'sensitive',
    RESERVED: 'reserved',
});

/**
 * Permissions génériques du périmètre Platform.
 *
 * Les permissions d'invitation commerciale sont distinctes de TEAM_* : une
 * invitation client ne doit jamais être interprétée comme une invitation à
 * rejoindre l'équipe interne de la Plateforme.
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

    COMMERCIAL_INVITATIONS_READ:
        'platform:commercial_invitations:read',
    COMMERCIAL_INVITATIONS_CREATE:
        'platform:commercial_invitations:create',
    COMMERCIAL_INVITATIONS_RESEND:
        'platform:commercial_invitations:resend',
    COMMERCIAL_INVITATIONS_REVOKE:
        'platform:commercial_invitations:revoke',

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

    RETENTION_READ: 'platform:retention:read',
    RETENTION_PREVIEW: 'platform:retention:preview',
    RETENTION_UPDATE: 'platform:retention:update',
    RETENTION_EXECUTE: 'platform:retention:execute',

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
