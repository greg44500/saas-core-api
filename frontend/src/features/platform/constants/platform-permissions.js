const PLATFORM_PERMISSION = Object.freeze({
  OVERVIEW_READ: 'platform:overview:read',
  USERS_READ: 'platform:users:read',
  WORKSPACES_READ: 'platform:workspaces:read',
  PLANS_READ: 'platform:plans:read',
  SUBSCRIPTIONS_READ: 'platform:subscriptions:read',
  ENTITLEMENT_OVERRIDES_READ: 'platform:entitlement_overrides:read',
  AUDIT_LOGS_READ: 'platform:audit_logs:read',
  TEAM_READ: 'platform:team:read',
  TEAM_MEMBER_ROLE_UPDATE: 'platform:team:member_role:update',
  TEAM_MEMBER_SUSPEND: 'platform:team:member:suspend',
  TEAM_MEMBER_REACTIVATE: 'platform:team:member:reactivate',
  TEAM_MEMBER_REVOKE: 'platform:team:member:revoke',
  ROLES_READ: 'platform:roles:read',
  SUPER_ADMINS_MANAGE: 'platform:super_admins:manage',
});

export { PLATFORM_PERMISSION };
