import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
}));

vi.mock('@/features/auth/components/user-menu', () => ({
  UserMenu: () => <button type="button">Compte test</button>,
}));

import { AccountLayout } from '@/app/layouts/account-layout';

function renderAccount(initialEntry) {
  const router = createMemoryRouter(
    [
      {
        path: '/account',
        Component: AccountLayout,
        children: [
          { path: 'profile', Component: () => <h1>Profil cible</h1> },
          { path: 'security', Component: () => <h1>Sécurité cible</h1> },
        ],
      },
      { path: '/workspaces/workspace-1/dashboard', Component: () => <h1>Workspace cible</h1> },
      { path: '/workspaces', Component: () => <h1>Workspaces cible</h1> },
      { path: '/platform/overview', Component: () => <h1>Platform cible</h1> },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('AccountLayout', () => {
  beforeEach(() => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { platformRole: 'user' },
    });
  });

  afterEach(() => cleanup());

  it('revient exactement à la page qui a ouvert les paramètres du compte', async () => {
    const user = userEvent.setup();
    const router = renderAccount({
      pathname: '/account/security',
      state: { accountReturnTo: '/workspaces/workspace-1/dashboard' },
    });

    await user.click(screen.getByRole('button', { name: 'Retour à l’application' }));

    expect(await screen.findByRole('heading', { name: 'Workspace cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/workspaces/workspace-1/dashboard');
  });

  it('conserve la destination de retour en naviguant entre Profil et Sécurité', async () => {
    const user = userEvent.setup();
    const router = renderAccount({
      pathname: '/account/profile',
      state: { accountReturnTo: '/workspaces/workspace-1/dashboard' },
    });

    await user.click(screen.getByRole('link', { name: 'Sécurité' }));
    expect(await screen.findByRole('heading', { name: 'Sécurité cible' })).toBeInTheDocument();
    expect(router.state.location.state).toEqual({
      accountReturnTo: '/workspaces/workspace-1/dashboard',
    });
  });

  it('utilise la console Platform comme fallback pour un super-admin', async () => {
    const user = userEvent.setup();
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { platformRole: 'super_admin' },
    });
    const router = renderAccount('/account/profile');

    await user.click(screen.getByRole('button', { name: 'Retour à l’application' }));

    expect(await screen.findByRole('heading', { name: 'Platform cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/platform/overview');
  });
});
