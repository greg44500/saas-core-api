import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());
const useLogoutMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
  useLogoutMutation: useLogoutMutationMock,
}));

import { UserMenu, getInitials } from '@/features/auth/components/user-menu';

function renderUserMenu() {
  const router = createMemoryRouter(
    [
      { path: '/workspaces/:workspaceId/dashboard', Component: UserMenu },
      { path: '/platform/overview', Component: () => <h1>Console cible</h1> },
      { path: '/login', Component: () => <h1>Connexion cible</h1> },
    ],
    { initialEntries: ['/workspaces/workspace-1/dashboard'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('UserMenu', () => {
  const logoutMock = vi.fn();
  const unwrapMock = vi.fn();

  beforeEach(() => {
    useGetCurrentUserQueryMock.mockReset();
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
    expect(screen.getByRole('menuitem', { name: 'Profil' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Sécurité' })).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: 'Console plateforme' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Déconnexion' })).toBeEnabled();
  });

  it('affiche la Console plateforme uniquement au super_admin', async () => {
    const user = userEvent.setup();
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        id: 'admin-1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@example.com',
        platformRole: 'super_admin',
      },
      isLoading: false,
    });

    const router = renderUserMenu();

    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le menu utilisateur' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Console plateforme' }));

    expect(await screen.findByRole('heading', { name: 'Console cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/platform/overview');
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
