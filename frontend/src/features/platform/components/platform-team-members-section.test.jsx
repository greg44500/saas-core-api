import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useListPlatformTeamMembersQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-team-api', () => ({
  useListPlatformTeamMembersQuery: useListPlatformTeamMembersQueryMock,
}));

import { PlatformTeamMembersSection } from '@/features/platform/components/platform-team-members-section';

const members = [
  {
    id: 'founder-member-id',
    isFounder: true,
    status: 'active',
    user: {
      id: 'founder-user-id',
      firstName: 'Gregory',
      lastName: 'BALLAT',
      email: 'gregory@example.com',
    },
    role: {
      id: 'super-admin-role-id',
      key: 'super_admin',
      name: 'Super administrateur',
      isSystem: true,
    },
  },
  {
    id: 'support-member-id',
    isFounder: false,
    status: 'suspended',
    user: {
      id: 'support-user-id',
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@example.com',
    },
    role: {
      id: 'support-role-id',
      key: 'technical_support',
      name: 'Support technique',
      isSystem: true,
    },
  },
];

describe('PlatformTeamMembersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListPlatformTeamMembersQueryMock.mockReturnValue({
      data: {
        members,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
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

  it('utilise la DataTable partagée pour afficher identité, qualité, rôle et statut', () => {
    render(<PlatformTeamMembersSection />);

    expect(useListPlatformTeamMembersQueryMock).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });

    expect(screen.getByRole('columnheader', { name: 'Membre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Qualité' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Rôle' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Statut' })).toBeInTheDocument();

    expect(screen.getByText('Gregory BALLAT')).toBeInTheDocument();
    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.getByText('Super administrateur')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();

    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Support technique')).toBeInTheDocument();
    expect(screen.getByText('Suspendu')).toBeInTheDocument();
  });

  it('affiche un état vide explicite sans fabriquer de lignes', () => {
    useListPlatformTeamMembersQueryMock.mockReturnValue({
      data: {
        members: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<PlatformTeamMembersSection />);

    expect(
      screen.getByText('Aucun membre actif ou suspendu dans l’équipe de la Plateforme.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
