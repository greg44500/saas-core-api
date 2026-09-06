import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

import {
  PlatformGuard,
  hasActivePlatformAccess,
} from '@/features/platform/components/platform-guard';

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
    useGetCurrentPlatformContextQueryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('reconnaît uniquement un contexte Platform actif avec des permissions', () => {
    expect(hasActivePlatformAccess({
      status: 'active',
      permissions: ['platform:overview:read'],
    })).toBe(true);
    expect(hasActivePlatformAccess({
      status: 'suspended',
      permissions: ['platform:overview:read'],
    })).toBe(false);
    expect(hasActivePlatformAccess({
      status: 'active',
      permissions: [],
    })).toBe(false);
    expect(hasActivePlatformAccess(null)).toBe(false);
  });

  it('autorise un membre Platform actif selon son autorité runtime', async () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: false,
        status: 'active',
        role: { name: 'Support technique' },
        permissions: ['platform:overview:read'],
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
    });

    renderGuard();

    expect(
      await screen.findByRole('heading', { name: 'Console autorisée' }),
    ).toBeInTheDocument();
  });

  it('redirige un utilisateur sans contexte Platform vers les workspaces', async () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: null,
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

  it('redirige immédiatement un membre Platform suspendu', async () => {
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: false,
        status: 'suspended',
        role: { name: 'Support client' },
        permissions: [],
      },
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
