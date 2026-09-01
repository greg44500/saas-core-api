const WORKSPACE_PERMISSION = Object.freeze({
  WORKSPACE_READ: 'workspace:read',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_OWNERSHIP_TRANSFER: 'workspace:ownership:transfer',
  MEMBER_READ: 'member:read',
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE: 'member:update',
  MEMBER_SUSPEND: 'member:suspend',
  MEMBER_REMOVE: 'member:remove',
  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  SUBSCRIPTION_READ: 'subscription:read',
  AUDIT_READ: 'audit:read',
  FILE_READ: 'file:read',
  FILE_UPLOAD: 'file:upload',
  FILE_DELETE: 'file:delete',
});

export { WORKSPACE_PERMISSION };
