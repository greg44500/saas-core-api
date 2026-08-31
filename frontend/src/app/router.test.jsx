import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { appRoutes } from '@/app/router';
import { ThemeProvider } from '@/components/shared/theme-provider';

function renderRoute(initialEntry) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry],
  });

  render(
    <ThemeProvider storageScope="router-tests">
      <RouterProvider router={router} />
    </ThemeProvider>,
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
    expect(
      screen.getByRole('heading', { name: 'Fondations UI prêtes' }),
    ).toBeInTheDocument();
  });

  it('charge paresseusement une route Auth dans AuthLayout', async () => {
    renderRoute('/login');

    expect(
      await screen.findByRole('heading', { name: 'Connexion' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Le formulaire de connexion sera implémenté en F5.')).toBeInTheDocument();
  });

  it('conserve workspaceId dans l’URL comme source de vérité du layout Workspace', async () => {
    renderRoute('/workspaces/workspace-123/dashboard');

    expect(await screen.findByText('workspace-123')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('rend le contexte Platform séparément du contexte Workspace', async () => {
    renderRoute('/platform/overview');

    expect(await screen.findByText('Console')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('affiche NotFound et permet un retour vers l’accueil', async () => {
    const user = userEvent.setup();
    const router = renderRoute('/route-inconnue');

    expect(
      await screen.findByRole('heading', { name: 'Page introuvable' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }));

    expect(router.state.location.pathname).toBe('/');
    expect(
      await screen.findByRole('heading', { name: 'Fondations UI prêtes' }),
    ).toBeInTheDocument();
  });
});
