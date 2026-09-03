import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
}));

import { AuthGuard, GuestGuard } from '@/features/auth/components/auth-guard';
import { authSlice } from '@/features/auth/store/auth-slice';

function createAuthenticatedStore() {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
    preloadedState: {
      auth: {
        accessToken: 'access-token',
        authStatus: 'authenticated',
      },
    },
  });
}

function renderAuthenticatedRoutes(initialEntry) {
  render(
    <Provider store={createAuthenticatedStore()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route
              path="/workspaces/:workspaceId/dashboard"
              element={<h1>Workspace cible</h1>}
            />
            <Route
              path="/platform/overview"
              element={<h1>Platform cible</h1>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('AuthGuard / GuestGuard', () => {
  beforeEach(() => {
    useGetCurrentUserQueryMock.mockReset();
  });

  afterEach(() => cleanup());

  it('redirige un super_admin restauré sur une route Workspace vers Platform au cold start', async () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { id: 'admin-1', platformRole: 'super_admin' },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });

    renderAuthenticatedRoutes('/workspaces/workspace-1/dashboard');

    expect(await screen.findByRole('heading', { name: 'Platform cible' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Workspace cible' })).not.toBeInTheDocument();
  });

  it('laisse un utilisateur standard restaurer directement son Workspace', async () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { id: 'user-1', platformRole: 'user' },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });

    renderAuthenticatedRoutes('/workspaces/workspace-1/dashboard');

    expect(await screen.findByRole('heading', { name: 'Workspace cible' })).toBeInTheDocument();
  });

  it('redirige un super_admin déjà authentifié depuis login vers Platform', async () => {
    useGetCurrentUserQueryMock.mockReturnValue({
      data: { id: 'admin-1', platformRole: 'super_admin' },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });

    render(
      <Provider store={createAuthenticatedStore()}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<h1>Connexion</h1>} />
            </Route>
            <Route path="/platform/overview" element={<h1>Platform cible</h1>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByRole('heading', { name: 'Platform cible' })).toBeInTheDocument();
  });
});
