import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useListPlatformTeamMembersQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-team-api', () => ({
  useListPlatformTeamMembersQuery: mocks.useListPlatformTeamMembersQuery,
}));
vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? (
      <aside aria-label={title}>
        {children}
      </aside>
    ) : null
  ),
}));

import { PlatformTeamMembersDrawer } from '@/features/platform/components/platform-team-members-drawer';

const member = {
  id: 'member-id',
  isFounder: true,
  status: 'active',
  user: {
    id: 'user-id',
    firstName: 'Gregory',
    lastName: 'BALLAT',
    email: 'gregory@example.com',
  },
  role: {
    id: 'role-id',
    key: 'super_admin',
    name: 'Super administrateur',
    isSystem: true,
  },
};

describe('PlatformTeamMembersDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useListPlatformTeamMembersQuery.mockReturnValue({
      data: {
        members: [member],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('charge les identités seulement lorsque le Drawer est ouvert', () => {
    const { rerender } = render(
      <PlatformTeamMembersDrawer onClose={vi.fn()} open={false} />,
    );

    expect(mocks.useListPlatformTeamMembersQuery).toHaveBeenLastCalledWith(
      { page: 1, limit: 20 },
      { skip: true },
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    rerender(
      <PlatformTeamMembersDrawer onClose={vi.fn()} open />,
    );

    expect(mocks.useListPlatformTeamMembersQuery).toHaveBeenLastCalledWith(
      { page: 1, limit: 20 },
      { skip: false },
    );
    expect(
      screen.getByRole('complementary', { name: 'Équipe de la Plateforme' }),
    ).toBeInTheDocument();
  });

  it('réutilise les colonnes membres dans un tableau compact sans scroll ni email', () => {
    render(<PlatformTeamMembersDrawer onClose={vi.fn()} open />);

    expect(screen.getByRole('columnheader', { name: 'Membre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Qualité' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Rôle' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Statut' })).toBeInTheDocument();

    expect(screen.getByText('Gregory BALLAT')).toBeInTheDocument();
    expect(screen.queryByText('gregory@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.getByText('Super administrateur')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveClass('table-fixed');
    expect(table.parentElement).toHaveClass('overflow-x-hidden');
    expect(table.parentElement).not.toHaveClass('overflow-x-auto');
  });
});
