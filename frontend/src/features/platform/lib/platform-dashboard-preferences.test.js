import { describe, expect, it } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  PLATFORM_DASHBOARD_WIDGETS,
  applyPlatformDashboardPreferences,
  getAccessiblePlatformDashboardWidgets,
  getHiddenPlatformSectionKeys,
} from '@/features/platform/lib/platform-dashboard-preferences';

describe('platform dashboard preferences', () => {
  it('propose uniquement les domaines correspondant aux permissions Platform', () => {
    const widgets = getAccessiblePlatformDashboardWidgets(
      PLATFORM_DASHBOARD_WIDGETS,
      [
        PLATFORM_PERMISSION.USERS_READ,
        PLATFORM_PERMISSION.TEAM_READ,
      ],
    );

    expect(widgets.map((widget) => widget.id)).toEqual([
      'platform.users',
      'platform.team',
    ]);
  });

  it('exige plans:read et workspaces:read pour la répartition par plan', () => {
    const withoutWorkspaceRead = getAccessiblePlatformDashboardWidgets(
      PLATFORM_DASHBOARD_WIDGETS,
      [PLATFORM_PERMISSION.PLANS_READ],
    );
    const withBothPermissions = getAccessiblePlatformDashboardWidgets(
      PLATFORM_DASHBOARD_WIDGETS,
      [
        PLATFORM_PERMISSION.PLANS_READ,
        PLATFORM_PERMISSION.WORKSPACES_READ,
      ],
    );

    expect(withoutWorkspaceRead.some((widget) => widget.id === 'platform.plans'))
      .toBe(false);
    expect(withBothPermissions.some((widget) => widget.id === 'platform.plans'))
      .toBe(true);
  });

  it('traduit uniquement les préférences Platform en sections masquées', () => {
    expect([...getHiddenPlatformSectionKeys([
      'core.files',
      'platform.subscriptions',
      'platform.team',
    ])]).toEqual(['subscriptions']);
  });

  it('réduit les sections visibles sans créer de droit et filtre les signaux liés', () => {
    const overview = {
      availableSections: {
        users: true,
        workspaces: true,
        plans: false,
        subscriptions: true,
        overrides: true,
        usage: true,
        files: true,
        audit: true,
      },
      attention: {
        totalSignals: 5,
        counts: {
          pastDueSubscriptions: 1,
          trialsExpiringNext7Days: 1,
          suspendedWorkspaces: 1,
          overridesExpiringNext7Days: 1,
          failedAuditEvents: 1,
        },
        items: [
          { id: 'subscription-1', type: 'subscription_past_due' },
          { id: 'workspace-1', type: 'workspace_suspended' },
          { id: 'audit-1', type: 'audit_failed' },
        ],
        recentFailedAuditEvents: [{ id: 'audit-1' }],
      },
    };

    const result = applyPlatformDashboardPreferences(overview, [
      'platform.workspaces',
      'platform.audit',
    ]);

    expect(result.availableSections.workspaces).toBe(false);
    expect(result.availableSections.audit).toBe(false);
    expect(result.availableSections.plans).toBe(false);
    expect(result.availableSections.subscriptions).toBe(true);
    expect(result.attention.counts).not.toHaveProperty('suspendedWorkspaces');
    expect(result.attention.counts).not.toHaveProperty('failedAuditEvents');
    expect(result.attention.items).toEqual([
      { id: 'subscription-1', type: 'subscription_past_due' },
    ]);
    expect(result.attention.recentFailedAuditEvents).toEqual([]);
    expect(result.attention.totalSignals).toBe(3);
  });
});
