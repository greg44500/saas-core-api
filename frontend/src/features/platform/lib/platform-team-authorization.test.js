import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  canActorTargetPlatformMember,
  canGovernCustomPlatformRoles,
  getAssignablePlatformRoles,
} from '@/features/platform/lib/platform-team-authorization';

const superAdminAccess = {
  role: { key: 'super_admin' },
  permissions: [
    PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
    PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
    PLATFORM_PERMISSION.OVERVIEW_READ,
    PLATFORM_PERMISSION.USERS_READ,
  ],
};

const platformAdminAccess = {
  role: { key: 'platform_admin' },
  permissions: [
    PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
    PLATFORM_PERMISSION.OVERVIEW_READ,
    PLATFORM_PERMISSION.USERS_READ,
  ],
};

describe('platform team frontend authorization policy', () => {
  it('réserve la gouvernance des rôles personnalisés au Fondateur ou au Super administrateur', () => {
    expect(canGovernCustomPlatformRoles(superAdminAccess)).toBe(true);
    expect(canGovernCustomPlatformRoles({
      ...platformAdminAccess,
      isFounder: true,
    })).toBe(true);
    expect(canGovernCustomPlatformRoles(platformAdminAccess)).toBe(false);
    expect(canGovernCustomPlatformRoles(null)).toBe(false);
  });

  it('interdit les actions visuelles sur le Fondateur et sur soi-même', () => {
    expect(canActorTargetPlatformMember({
      currentUserId: 'actor-id',
      member: {
        isFounder: true,
        user: { id: 'founder-id' },
        role: { key: 'super_admin' },
      },
      platformAccess: superAdminAccess,
    })).toBe(false);

    expect(canActorTargetPlatformMember({
      currentUserId: 'actor-id',
      member: {
        isFounder: false,
        user: { id: 'actor-id' },
        role: { key: 'platform_admin' },
      },
      platformAccess: superAdminAccess,
    })).toBe(false);
  });

  it('réserve la gestion visuelle d’un autre Super administrateur à un Super administrateur autorisé', () => {
    const member = {
      isFounder: false,
      user: { id: 'other-user-id' },
      role: { key: 'super_admin' },
    };

    expect(canActorTargetPlatformMember({
      currentUserId: 'actor-id',
      member,
      platformAccess: platformAdminAccess,
    })).toBe(false);

    expect(canActorTargetPlatformMember({
      currentUserId: 'actor-id',
      member,
      platformAccess: superAdminAccess,
    })).toBe(true);
  });

  it('filtre les rôles assignables selon la hiérarchie de permissions', () => {
    const roles = [
      {
        id: 'support-role-id',
        key: 'technical_support',
        status: 'active',
        permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
      },
      {
        id: 'equal-role-id',
        key: 'custom_equal',
        status: 'active',
        permissions: [...platformAdminAccess.permissions],
      },
      {
        id: 'super-role-id',
        key: 'super_admin',
        status: 'active',
        permissions: [...superAdminAccess.permissions],
      },
      {
        id: 'archived-role-id',
        key: 'custom_archived',
        status: 'archived',
        permissions: [],
      },
    ];

    expect(getAssignablePlatformRoles({
      currentRoleId: 'current-role-id',
      platformAccess: platformAdminAccess,
      roles,
    }).map((role) => role.id)).toEqual(['support-role-id']);

    expect(getAssignablePlatformRoles({
      currentRoleId: 'current-role-id',
      platformAccess: superAdminAccess,
      roles,
    }).map((role) => role.id)).toEqual([
      'support-role-id',
      'equal-role-id',
      'super-role-id',
    ]);
  });
});
