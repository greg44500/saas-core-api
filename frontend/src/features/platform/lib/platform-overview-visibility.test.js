import { describe, expect, it } from 'vitest';

import {
  buildPlatformOverviewAttentionItems,
  hasAnyPlatformOverviewSection,
  resolvePlatformOverviewVisibility,
} from '@/features/platform/lib/platform-overview-visibility';

describe('platform overview visibility', () => {
  it('reste fail-closed quand le contrat availableSections est absent', () => {
    const sections = resolvePlatformOverviewVisibility(undefined);

    expect(sections).toEqual({
      users: false,
      workspaces: false,
      plans: false,
      subscriptions: false,
      overrides: false,
      usage: false,
      files: false,
      audit: false,
    });
    expect(hasAnyPlatformOverviewSection(sections)).toBe(false);
  });

  it('n’expose dans la synthèse que les catégories autorisées', () => {
    const sections = resolvePlatformOverviewVisibility({
      users: true,
      workspaces: true,
      plans: true,
      subscriptions: true,
      overrides: true,
      usage: true,
      files: true,
      audit: false,
    });
    const items = buildPlatformOverviewAttentionItems({
      sections,
      attention: {
        counts: {
          pastDueSubscriptions: 3,
          suspendedWorkspaces: 2,
          failedAuditEvents: 9,
          trialsExpiringNext7Days: 1,
          overridesExpiringNext7Days: 4,
        },
      },
    });

    expect(items.map((item) => item.key)).toEqual([
      'past-due',
      'trials-expiring',
      'suspended-workspaces',
      'overrides-expiring',
    ]);
    expect(items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'failed-audits' }),
    ]));
  });
});
