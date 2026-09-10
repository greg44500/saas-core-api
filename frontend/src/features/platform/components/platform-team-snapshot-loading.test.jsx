import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  useGetCurrentPlatformContextQuery: vi.fn(),
  useGetCurrentUserPreferencesQuery: vi.fn(),
  useGetPlatformTeamSummaryQuery: vi.fn(),
}));

vi.mock('@/features/preferences/api/user-preferences-api', () => ({
  useGetCurrentUserPreferencesQuery: mocks.useGetCurrentUserPreferencesQuery,
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));

vi.mock('@/features/platform/api/platform-team-api', () => ({
  useGetPlatformTeamSummaryQuery: mocks.useGetPlatformTeamSummaryQuery,
}));

vi.mock('@/features/platform/components/platform-team-members-drawer', () => ({
  PlatformTeamMembersDrawer: () => null,
}));

import { PlatformTeamSnapshotSection } from '@/features/platform/components/platform-team-snapshot-card';

describe('PlatformTeamSnapshotSection loading', () => {
  it('affiche un skeleton lorsque le résumé est encore en premier chargement', () => {
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        permissions: [PLATFORM_PERMISSION.TEAM_READ],
        status: 'active',
      },
    });
    mocks.useGetCurrentUserPreferencesQuery.mockReturnValue({
      data: {
        dashboard: { hiddenWidgetIds: [] },
      },
    });
    mocks.useGetPlatformTeamSummaryQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<PlatformTeamSnapshotSection />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement de l’équipe…',
    );
  });
});
