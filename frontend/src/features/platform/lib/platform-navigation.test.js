import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  canAccessPlatformPath,
  getFirstPlatformDestination,
  getPlatformNavigationItemForPath,
  getVisiblePlatformNavigationSections,
  hasActivePlatformAccess,
} from '@/features/platform/lib/platform-navigation';

describe('platform navigation policy', () => {
  it('projette uniquement les destinations autorisées', () => {
    const sections = getVisiblePlatformNavigationSections([
      PLATFORM_PERMISSION.USERS_READ,
      PLATFORM_PERMISSION.AUDIT_LOGS_READ,
    ]);

    expect(sections.flatMap((section) => section.items.map((item) => item.to))).toEqual([
      '/platform/users',
      '/platform/audit-logs',
    ]);
  });

  it('choisit la première destination réellement autorisée', () => {
    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe('/platform/users');

    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.TEAM_READ],
    })).toBe('/platform/team');
  });

  it('résout une route Core Platform vers sa politique de navigation', () => {
    expect(
      getPlatformNavigationItemForPath('/platform/plans')?.id,
    ).toBe('plans');
    expect(
      getPlatformNavigationItemForPath('/platform/team/roles')?.id,
    ).toBe('team');
  });

  it('refuse une route Core dont la permission a été retirée', () => {
    const platformAccess = {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    };

    expect(
      canAccessPlatformPath('/platform/users', platformAccess),
    ).toBe(true);
    expect(
      canAccessPlatformPath('/platform/plans', platformAccess),
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
    expect(canAccessPlatformPath('/platform/users', null)).toBe(false);
  });
});
