import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { appRoutes } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { createAppStore } from '@/store/store';

function renderRoute(initialEntry, authStatus = 'unauthenticated') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
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
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('rend la route publique racine dans PublicLayout', () => {
    renderRoute('/');
    expect(screen.getByText('SaaS Core')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fondations UI prêtes' })).toBeInTheDocument();
  });

  it('rend Login pour un visiteur non authentifié', async () => {
    renderRoute('/login');
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('redirige une route protégée vers Login en conservant la destination', async () => {
    const router = renderRoute('/workspaces/workspace-123/dashboard');
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from.pathname).toBe('/workspaces/workspace-123/dashboard');
  });

  it('rend le workspace pour une session authentifiée', async () => {
    renderRoute('/workspaces/workspace-123/dashboard', 'authenticated');
    expect(await screen.findByText('workspace-123')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('rend le contexte Platform pour une session authentifiée', async () => {
    renderRoute('/platform/overview', 'authenticated');
    expect(await screen.findByText('Console')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('affiche NotFound et permet un retour vers l’accueil', async () => {
    const user = userEvent.setup();
    const router = renderRoute('/route-inconnue');
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }));
    expect(router.state.location.pathname).toBe('/');
  });
});
