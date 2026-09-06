import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  getFirstPlatformDestination,
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

  it('reste fail-closed sans accès Platform actif exploitable', () => {
    expect(hasActivePlatformAccess(null)).toBe(false);
    expect(hasActivePlatformAccess({ status: 'suspended', permissions: [] })).toBe(false);
    expect(hasActivePlatformAccess({ status: 'active', permissions: [] })).toBe(false);
    expect(getFirstPlatformDestination(null)).toBeNull();
    expect(getFirstPlatformDestination({ status: 'suspended', permissions: [] })).toBeNull();
  });
});
