import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  dashboardProps: vi.fn(),
  useGetCurrentPlatformContextQuery: vi.fn(),
  useGetCurrentUserPreferencesQuery: vi.fn(),
}));

vi.mock('@/components/shared/dashboard-display-preferences', () => ({
  DashboardDisplayPreferences: (props) => {
    mocks.dashboardProps(props);
    return (
      <div>
        {props.accessibleWidgets.map((widget) => (
          <span key={widget.id}>{widget.label}</span>
        ))}
      </div>
    );
  },
}));

vi.mock('@/features/preferences/api/user-preferences-api', () => ({
  useGetCurrentUserPreferencesQuery: mocks.useGetCurrentUserPreferencesQuery,
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));

import { PlatformDashboardDisplayPreferences } from '@/features/platform/components/platform-dashboard-display-preferences';

describe('PlatformDashboardDisplayPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useGetCurrentUserPreferencesQuery.mockReturnValue({
      data: { dashboard: { hiddenWidgetIds: [] } },
      isLoading: false,
    });
  });

  it('propose uniquement les domaines accessibles au membre Platform', () => {
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        permissions: [
          PLATFORM_PERMISSION.USERS_READ,
          PLATFORM_PERMISSION.TEAM_READ,
        ],
      },
    });

    render(<PlatformDashboardDisplayPreferences triggerVariant="icon" />);

    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Équipe de la Plateforme')).toBeInTheDocument();
    expect(screen.queryByText('Abonnements')).not.toBeInTheDocument();
    expect(screen.queryByText('Répartition par plan')).not.toBeInTheDocument();

    expect(mocks.dashboardProps).toHaveBeenCalledWith(
      expect.objectContaining({
        accessibleWidgets: expect.arrayContaining([
          expect.objectContaining({ id: 'platform.users' }),
          expect.objectContaining({ id: 'platform.team' }),
        ]),
        triggerVariant: 'icon',
      }),
    );
  });
});
