import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  drawerProps: vi.fn(),
  useGetCurrentPlatformContextQuery: vi.fn(),
  useGetPlatformTeamSummaryQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));
vi.mock('@/features/platform/api/platform-team-api', () => ({
  useGetPlatformTeamSummaryQuery: mocks.useGetPlatformTeamSummaryQuery,
}));
vi.mock('@/features/platform/components/platform-team-members-drawer', () => ({
  PlatformTeamMembersDrawer: (props) => {
    mocks.drawerProps(props);
    return props.open ? <div data-testid="team-members-drawer">Détail équipe</div> : null;
  },
}));

import { PlatformTeamSnapshotSection } from '@/features/platform/components/platform-team-snapshot-card';

const summary = {
  total: 3,
  active: 2,
  suspended: 1,
  founderCount: 1,
  byRole: [
    {
      role: {
        id: 'support-role-id',
        key: 'technical_support',
        name: 'Support technique',
        isSystem: true,
      },
      total: 2,
      active: 1,
      suspended: 1,
      percentage: 67,
    },
    {
      role: {
        id: 'super-admin-role-id',
        key: 'super_admin',
        name: 'Super administrateur',
        isSystem: true,
      },
      total: 1,
      active: 1,
      suspended: 0,
      percentage: 33,
    },
  ],
};

describe('PlatformTeamSnapshotSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.TEAM_READ],
      },
    });
    mocks.useGetPlatformTeamSummaryQuery.mockReturnValue({
      data: summary,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('affiche les KPI backend puis déplie la répartition par rôle', async () => {
    const user = userEvent.setup();
    render(<PlatformTeamSnapshotSection />);

    const section = screen.getByRole('region', { name: 'Organisation interne' });
    expect(within(section).getByText('Équipe de la Plateforme')).toBeInTheDocument();

    const membersLabel = within(section).getByText('Membres');
    const activeLabel = within(section).getByText('Actifs');
    const suspendedLabel = within(section).getByText('Suspendus');
    const founderLabel = within(section).getByText('Fondateur');

    expect(membersLabel.nextElementSibling).toHaveTextContent('3');
    expect(activeLabel.nextElementSibling).toHaveTextContent('2');
    expect(suspendedLabel.nextElementSibling).toHaveTextContent('1');
    expect(founderLabel.nextElementSibling).toHaveTextContent('1');

    await user.click(
      within(section).getByRole('button', { name: 'Afficher le détail' }),
    );

    const distribution = within(section).getByRole('group', {
      name: 'Répartition de l’équipe de la Plateforme par rôle',
    });
    expect(within(distribution).getByText('Support technique')).toBeInTheDocument();
    expect(within(distribution).getByText('2 membres · 67 %')).toBeInTheDocument();
    expect(within(distribution).getByText('1 membre · 33 %')).toBeInTheDocument();
  });

  it('ouvre le Drawer de détail depuis le chevron de drill-down', async () => {
    const user = userEvent.setup();
    render(<PlatformTeamSnapshotSection />);

    expect(screen.queryByTestId('team-members-drawer')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Voir le détail de l’équipe de la Plateforme',
      }),
    );

    expect(screen.getByTestId('team-members-drawer')).toBeInTheDocument();
    expect(mocks.drawerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true }),
    );
  });

  it('ne charge ni n’affiche les données équipe sans team:read', () => {
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
      },
    });

    render(<PlatformTeamSnapshotSection />);

    expect(mocks.useGetPlatformTeamSummaryQuery).toHaveBeenCalledWith(
      undefined,
      { skip: true },
    );
    expect(
      screen.queryByRole('region', { name: 'Organisation interne' }),
    ).not.toBeInTheDocument();
  });
});
