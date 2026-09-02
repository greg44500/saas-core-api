import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetWorkspaceByIdQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useGetWorkspaceByIdQuery: useGetWorkspaceByIdQueryMock,
  useListWorkspacesQuery: useListWorkspacesQueryMock,
}));

vi.mock('@/features/auth/components/user-menu', () => ({
  UserMenu: () => <button type="button">Compte test</button>,
}));

vi.mock('@/features/files/components/workspace-files-route', () => ({
  WorkspaceFilesRoute: () => <h1>Fichiers</h1>,
}));

vi.mock('@/features/subscription/components/workspace-subscription-route', () => ({
  WorkspaceSubscriptionRoute: () => <h1>Abonnement</h1>,
}));

vi.mock('@/features/workspace/pages/workspace-settings-page', () => ({
  WorkspaceSettingsPage: () => <h1>Paramètres du workspace</h1>,
}));

vi.mock('@/features/platform/components/platform-guard', () => ({
  PlatformGuard: () => <Outlet />,
}));

import { createAppRoutes } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { createAppStore } from '@/store/store';

function renderRoute(initialEntry, authStatus = 'unauthenticated') {
  const router = createMemoryRouter(createAppRoutes(), {
    initialEntries: [initialEntry],
  });
  const store = createAppStore({
    auth: {
      accessToken: authStatus === 'authenticated' ? 'test-token' : null,
      authStatus,
    },
  });

  render(
    <Provider store={store}>
      <ThemeProvider storageScope="router-tests">
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>,
  );

  return router;
}

describe('application routing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    useGetWorkspaceByIdQueryMock.mockReset();
    useListWorkspacesQueryMock.mockReset();
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: {
        workspace: {
          id: 'workspace-123',
          name: 'Workspace Démo',
          status: 'active',
        },
        membership: {
          id: 'membership-123',
          role: { key: 'owner', name: 'Propriétaire' },
        },
        permissions: [
          'workspace:read',
          'workspace:update',
          'member:read',
          'file:read',
          'subscription:read',
        ],
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useListWorkspacesQueryMock.mockReturnValue({
      data: [{ id: 'workspace-123', name: 'Workspace Démo' }],
      isLoading: false,
      isFetching: false,
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('rend la route publique racine dans PublicLayout', () => {
    renderRoute('/');
    expect(screen.getByText('SaaS Core')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Fondations UI prêtes' }),
    ).toBeInTheDocument();
  });

  it('rend Login pour un visiteur non authentifié', async () => {
    renderRoute('/login');
    expect(
      await screen.findByRole('heading', { name: 'Connexion' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Se connecter' }),
    ).toBeInTheDocument();
  });

  it('redirige une route protégée vers Login en conservant la destination', async () => {
    const router = renderRoute('/workspaces/workspace-123/dashboard');
    expect(
      await screen.findByRole('heading', { name: 'Connexion' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from.pathname).toBe(
      '/workspaces/workspace-123/dashboard',
    );
  });

  it('rend le workspace réel pour une session authentifiée', async () => {
    renderRoute('/workspaces/workspace-123/dashboard', 'authenticated');
    expect(await screen.findAllByText('Workspace Démo')).not.toHaveLength(0);
    expect(
      screen.getByRole('heading', { name: 'Tableau de bord' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compte test' })).toBeInTheDocument();
  });

  it('rend la route Files dans le shell workspace', async () => {
    renderRoute('/workspaces/workspace-123/files', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Fichiers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fichiers' })).toBeInTheDocument();
  });

  it('rend la route Abonnement dans le shell workspace', async () => {
    renderRoute('/workspaces/workspace-123/subscription', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Abonnement' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abonnement' })).toBeInTheDocument();
  });

  it('rend la route Paramètres dans le shell workspace', async () => {
    renderRoute('/workspaces/workspace-123/settings', 'authenticated');

    expect(
      await screen.findByRole('heading', { name: 'Paramètres du workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Paramètres' })).toBeInTheDocument();
  });

  it('rend le shell Platform et sa navigation pour une session authentifiée', async () => {
    renderRoute('/platform/overview', 'authenticated');

    expect(await screen.findByText('Console Platform')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigation Platform' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Utilisateurs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('navigue vers une section Platform préparée', async () => {
    const user = userEvent.setup();
    const router = renderRoute('/platform/overview', 'authenticated');

    await user.click(await screen.findByRole('link', { name: 'Utilisateurs' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/platform/users');
    });
    expect(await screen.findByRole('heading', { name: 'Utilisateurs' })).toBeInTheDocument();
  });

  it('affiche NotFound et permet un retour vers l’accueil', async () => {
    const user = userEvent.setup();
    const router = renderRoute('/route-inconnue');
    expect(
      await screen.findByRole('heading', { name: 'Page introuvable' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }));
    expect(router.state.location.pathname).toBe('/');
  });
});
