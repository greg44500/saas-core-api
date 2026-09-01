import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
}));

import { PlatformGuard } from '@/features/platform/components/platform-guard';

function PlatformProbe() {
  return <h1>Console autorisée</h1>;
}

function WorkspacesProbe() {
  return <h1>Workspaces cible</h1>;
}

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        path: '/platform',
        Component: PlatformGuard,
        children: [{ path: 'overview', Component: PlatformProbe }],
      },
      { path: '/workspaces', Component: WorkspacesProbe },
    ],
    { initialEntries: ['/platform/overview'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('PlatformGuard', () => {
  beforeEach(() => {
    useGetCurrentUserQueryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('autorise un super_admin', async () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { id: 'admin-1', platformRole: 'super_admin' },
      error: undefined,
      isLoading: false,
      isFetching: false,
    });

    renderGuard();

    expect(
      await screen.findByRole('heading', { name: 'Console autorisée' }),
    ).toBeInTheDocument();
  });

  it('redirige un utilisateur standard vers les workspaces', async () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { id: 'user-1' },
      error: undefined,
      isLoading: false,
      isFetching: false,
    });

    const router = renderGuard();

    expect(
      await screen.findByRole('heading', { name: 'Workspaces cible' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/workspaces');
  });
});
