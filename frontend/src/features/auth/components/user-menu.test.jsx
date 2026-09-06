import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());
const useLogoutMutationMock = vi.hoisted(() => vi.fn());
const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
  useLogoutMutation: useLogoutMutationMock,
}));
vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

import { UserMenu, getInitials } from '@/features/auth/components/user-menu';

function renderUserMenu(initialPath = '/workspaces/workspace-1/dashboard') {
  const router = createMemoryRouter(
    [
      { path: '/workspaces/:workspaceId/dashboard', Component: UserMenu },
      { path: '/account/profile', Component: () => <h1>Profil cible</h1> },
      { path: '/account/security', Component: () => <h1>Sécurité cible</h1> },
      { path: '/platform/overview', Component: UserMenu },
      { path: '/platform/users', Component: UserMenu },
      { path: '/login', Component: () => <h1>Connexion cible</h1> },
    ],
    { initialEntries: [initialPath] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('UserMenu', () => {
  const logoutMock = vi.fn();
  const unwrapMock = vi.fn();

  beforeEach(() => {
    useGetCurrentUserQueryMock.mockReset();
    useGetCurrentPlatformContextQueryMock.mockReset();
    useLogoutMutationMock.mockReset();
    logoutMock.mockReset();
    unwrapMock.mockReset();

    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        id: 'user-1',
        firstName: 'Greg',
        lastName: 'Martin',
        email: 'greg@example.com',
      },
      isLoading: false,
    });
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
    });

    unwrapMock.mockResolvedValue(undefined);
    logoutMock.mockReturnValue({ unwrap: unwrapMock });
    useLogoutMutationMock.mockReturnValue([
      logoutMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('calcule les initiales à partir du prénom et du nom', () => {
    expect(getInitials({ firstName: 'Greg', lastName: 'Martin' })).toBe('GM');
    expect(getInitials({ email: 'user@example.com' })).toBe('U');
  });

  it('affiche l’identité et les actions du compte', async () => {
    const user = userEvent.setup();
    renderUserMenu();

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );

    expect(screen.getByText('Greg Martin')).toBeInTheDocument();
    expect(screen.getByText('greg@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Profil' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Sécurité' })).toBeEnabled();
    expect(screen.queryByText('Fondateur')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Console d’administration' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Déconnexion' })).toBeEnabled();
  });

  it('affiche la qualité Fondateur séparément du rôle Platform', async () => {
    const user = userEvent.setup();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: true,
        status: 'active',
        role: { name: 'Super administrateur' },
        permissions: ['platform:overview:read'],
      },
      isLoading: false,
    });

    renderUserMenu();

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );

    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.getByText('Super administrateur')).toBeInTheDocument();
  });

  it('se ferme lors d’un clic à l’extérieur et avec Escape', async () => {
    const user = userEvent.setup();
    renderUserMenu();

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' });

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('se ferme lorsqu’une navigation extérieure change de route', async () => {
    const user = userEvent.setup();
    const router = renderUserMenu('/platform/overview');

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await router.navigate('/platform/users');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('ouvre le profil en mémorisant la page d’origine', async () => {
    const user = userEvent.setup();
    const router = renderUserMenu();

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }));
    await user.click(screen.getByRole('menuitem', { name: 'Profil' }));

    expect(await screen.findByRole('heading', { name: 'Profil cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account/profile');
    expect(router.state.location.state).toEqual({
      accountReturnTo: '/workspaces/workspace-1/dashboard',
    });
  });

  it('propose la console lorsque la permission runtime overview:read est active', async () => {
    const user = userEvent.setup();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: false,
        status: 'active',
        role: { name: 'Support technique' },
        permissions: ['platform:overview:read'],
      },
      isLoading: false,
    });

    const router = renderUserMenu();

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Console d’administration' }));

    expect(router.state.location.pathname).toBe('/platform/overview');
  });

  it('masque le raccourci console lorsque le membre est déjà dans Platform', async () => {
    const user = userEvent.setup();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: true,
        status: 'active',
        role: { name: 'Super administrateur' },
        permissions: ['platform:overview:read'],
      },
      isLoading: false,
    });

    renderUserMenu('/platform/overview');

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );

    expect(
      screen.queryByRole('menuitem', { name: 'Console d’administration' }),
    ).not.toBeInTheDocument();
  });

  it('déconnecte la session puis revient vers Login', async () => {
    const user = userEvent.setup();
    const router = renderUserMenu();

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Déconnexion' }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(unwrapMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Connexion cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
