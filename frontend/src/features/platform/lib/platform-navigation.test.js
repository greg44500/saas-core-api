import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  canAccessPlatformPath,
  getActivePlatformNavigationGroupId,
  getFirstPlatformDestination,
  getPlatformNavigationItemForPath,
  getVisiblePlatformNavigationSections,
  hasActivePlatformAccess,
} from '@/features/platform/lib/platform-navigation';

function visibleDestinations(permissions) {
  return getVisiblePlatformNavigationSections(permissions).flatMap((entry) => (
    entry.type === 'group'
      ? entry.items.map((item) => item.to)
      : [entry.to]
  ));
}

describe('platform navigation policy', () => {
  it('projette uniquement les destinations autorisées et masque les groupes vides', () => {
    const entries = getVisiblePlatformNavigationSections([
      PLATFORM_PERMISSION.USERS_READ,
      PLATFORM_PERMISSION.RETENTION_READ,
    ]);

    expect(visibleDestinations([
      PLATFORM_PERMISSION.USERS_READ,
      PLATFORM_PERMISSION.RETENTION_READ,
    ])).toEqual([
      '/platform/users',
      '/platform/retention',
    ]);
    expect(entries.map((entry) => entry.id)).toEqual([
      'clients',
      'security-data',
    ]);
  });

  it('choisit la première destination réellement autorisée', () => {
    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
    })).toBe('/platform/overview');

    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe('/platform/users');

    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.TEAM_READ],
    })).toBe('/platform/team');
  });

  it('résout les routes Core vers leur item et leur groupe actif', () => {
    expect(
      getPlatformNavigationItemForPath('/platform/plans')?.id,
    ).toBe('plans');
    expect(
      getPlatformNavigationItemForPath('/platform/team/roles')?.id,
    ).toBe('team');
    expect(
      getPlatformNavigationItemForPath('/platform/retention')?.id,
    ).toBe('retention');

    const entries = getVisiblePlatformNavigationSections([
      PLATFORM_PERMISSION.RETENTION_READ,
    ]);

    expect(
      getActivePlatformNavigationGroupId(entries, '/platform/retention'),
    ).toBe('security-data');
  });

  it('refuse la rétention lorsque la permission read a été retirée', () => {
    const platformAccess = {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.AUDIT_LOGS_READ],
    };

    expect(
      canAccessPlatformPath('/platform/audit-logs', platformAccess),
    ).toBe(true);
    expect(
      canAccessPlatformPath('/platform/retention', platformAccess),
    ).toBe(false);
  });

  it('préserve le point d’extension des routes Platform dérivées', () => {
    expect(canAccessPlatformPath('/platform/catalog', {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe(true);
  });

  it('reste fail-closed sans accès Platform actif exploitable', () => {
    expect(hasActivePlatformAccess(null)).toBe(false);
    expect(hasActivePlatformAccess({ status: 'suspended', permissions: [] })).toBe(false);
    expect(hasActivePlatformAccess({ status: 'active', permissions: [] })).toBe(false);
    expect(getFirstPlatformDestination(null)).toBeNull();
    expect(getFirstPlatformDestination({ status: 'suspended', permissions: [] })).toBeNull();
    expect(canAccessPlatformPath('/platform/retention', null)).toBe(false);
  });
});
