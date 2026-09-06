import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

vi.mock('@/features/platform/components/platform-team-members-section', () => ({
  PlatformTeamMembersSection: () => <div>Tableau des membres</div>,
}));

import { PlatformTeamPage } from '@/features/platform/pages/platform-team-page';

function renderPage(path = '/platform/team/members') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/platform/team/:section?" element={<PlatformTeamPage />} />
        <Route path="/workspaces" element={<p>Workspaces</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformTeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: [
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.ROLES_READ,
        ],
      },
      isLoading: false,
      isFetching: false,
    });
  });

  afterEach(() => cleanup());

  it('affiche les trois vues dans un même espace avec la vue active soulignée', () => {
    renderPage('/platform/team/invitations');

    expect(
      screen.getByRole('heading', { name: 'Équipe de la Plateforme', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Membres' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Invitations' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Rôles et permissions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Invitations', level: 2 }),
    ).toBeInTheDocument();
  });

  it('branche la vue Membres sur son composant métier sans dupliquer le tableau dans la page', () => {
    renderPage('/platform/team/members');

    expect(
      screen.getByRole('heading', { name: 'Membres', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tableau des membres')).toBeInTheDocument();
  });

  it('masque l’onglet rôles lorsque roles:read manque', () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.TEAM_READ],
      },
      isLoading: false,
      isFetching: false,
    });

    renderPage('/platform/team/members');

    expect(screen.getByRole('link', { name: 'Membres' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Invitations' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Rôles et permissions' }),
    ).not.toBeInTheDocument();
  });

  it('redirige hors de la console si aucune vue équipe n’est autorisée', () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
      },
      isLoading: false,
      isFetching: false,
    });

    renderPage('/platform/team/members');

    expect(screen.getByText('Workspaces')).toBeInTheDocument();
  });
});
