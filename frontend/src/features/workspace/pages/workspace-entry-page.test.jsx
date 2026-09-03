import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useListWorkspacesQuery: useListWorkspacesQueryMock,
}));

import { WorkspaceEntryPage } from '@/features/workspace/pages/workspace-entry-page';

function renderEntry(workspaces, user = { id: 'user-1', platformRole: 'user' }) {
  useGetCurrentUserQueryMock.mockReturnValue({
    data: user,
    isLoading: false,
    isFetching: false,
  });
  useListWorkspacesQueryMock.mockReturnValue({
    data: workspaces,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });

  const router = createMemoryRouter(
    [
      { path: '/workspaces', Component: WorkspaceEntryPage },
      { path: '/platform/overview', Component: () => <h1>Platform cible</h1> },
      { path: '/onboarding/workspace', Component: () => <h1>Onboarding cible</h1> },
      {
        path: '/workspaces/:workspaceId/dashboard',
        Component: () => <h1>Dashboard cible</h1>,
      },
    ],
    { initialEntries: ['/workspaces'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('WorkspaceEntryPage', () => {
  beforeEach(() => {
    useGetCurrentUserQueryMock.mockReset();
    useListWorkspacesQueryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirige le super_admin vers son contexte Platform principal', async () => {
    const router = renderEntry(
      [{ id: 'workspace-1', name: 'Acme' }],
      { id: 'platform-admin', platformRole: 'super_admin' },
    );

    expect(await screen.findByRole('heading', { name: 'Platform cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/platform/overview');
  });

  it('redirige vers onboarding lorsque la liste est vide', async () => {
    const router = renderEntry([]);
    expect(await screen.findByRole('heading', { name: 'Onboarding cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding/workspace');
  });

  it('redirige directement vers le dashboard avec un seul workspace', async () => {
    const router = renderEntry([{ id: 'workspace-1', name: 'Acme' }]);
    expect(await screen.findByRole('heading', { name: 'Dashboard cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/workspaces/workspace-1/dashboard');
  });

  it('affiche un choix explicite avec plusieurs workspaces', async () => {
    renderEntry([
      { id: 'workspace-1', name: 'Acme', membership: { role: { name: 'Owner' } } },
      { id: 'workspace-2', name: 'Beta', membership: { role: { name: 'Member' } } },
    ]);

    expect(await screen.findByRole('heading', { name: 'Choisissez un espace' })).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Ouvrir cet espace' })).toHaveLength(2);
  });
});
