import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  PLATFORM_ROLE_STATUS,
  PLATFORM_TEAM_ROLE_KEY,
} from '@/features/platform/constants/platform-team';

function isStrictPermissionSubset(candidatePermissions, actorPermissions) {
  const candidateSet = new Set(candidatePermissions ?? []);
  const actorSet = new Set(actorPermissions ?? []);

  return candidateSet.size < actorSet.size
    && [...candidateSet].every((permission) => actorSet.has(permission));
}

function isSuperAdminAuthorization(platformAccess) {
  return platformAccess?.role?.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN;
}

function canGovernCustomPlatformRoles(platformAccess) {
  return platformAccess?.isFounder === true
    || isSuperAdminAuthorization(platformAccess);
}

function canActorManageTargetRole({ platformAccess, targetRole }) {
  if (!platformAccess || !targetRole) return false;

  if (targetRole.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
    return isSuperAdminAuthorization(platformAccess)
      && platformAccess.permissions?.includes(
        PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
      );
  }

  if (isSuperAdminAuthorization(platformAccess)) {
    return true;
  }

  return isStrictPermissionSubset(
    targetRole.permissions,
    platformAccess.permissions,
  );
}

/**
 * Filtre UX pour les actions de cycle de vie. Les règles de hiérarchie fines
 * restent revalidées par le backend, car le DTO membre n'expose volontairement
 * pas toutes les permissions du rôle cible.
 */
function canActorTargetPlatformMember({
  currentUserId,
  member,
  platformAccess,
}) {
  if (!member || member.isFounder) return false;
  if (!currentUserId || member.user?.id === currentUserId) return false;

  if (member.role?.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
    return isSuperAdminAuthorization(platformAccess)
      && platformAccess?.permissions?.includes(
        PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
      );
  }

  return true;
}

function getAssignablePlatformRoles({
  currentRoleId,
  platformAccess,
  roles,
}) {
  return (roles ?? []).filter((role) => {
    if (role.status !== PLATFORM_ROLE_STATUS.ACTIVE) return false;
    if (role.id === currentRoleId) return false;

    return canActorManageTargetRole({
      platformAccess,
      targetRole: role,
    });
  });
}

export {
  canActorManageTargetRole,
  canActorTargetPlatformMember,
  canGovernCustomPlatformRoles,
  getAssignablePlatformRoles,
  isStrictPermissionSubset,
  isSuperAdminAuthorization,
};
