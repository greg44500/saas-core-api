import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());
const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useListWorkspacesQuery: useListWorkspacesQueryMock,
}));

import { WorkspaceEntryPage } from '@/features/workspace/pages/workspace-entry-page';

function renderEntry(workspaces, platformAccess = null) {
  useGetCurrentPlatformContextQueryMock.mockReturnValue({
    data: platformAccess,
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
      { path: '/platform/users', Component: () => <h1>Utilisateurs Platform</h1> },
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
    useGetCurrentPlatformContextQueryMock.mockReset();
    useListWorkspacesQueryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirige un membre Platform actif vers sa première destination autorisée', async () => {
    const router = renderEntry(
      [{ id: 'workspace-1', name: 'Acme' }],
      {
        status: 'active',
        permissions: ['platform:users:read'],
      },
    );

    expect(
      await screen.findByRole('heading', { name: 'Utilisateurs Platform' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/platform/users');
    expect(useListWorkspacesQueryMock).toHaveBeenCalledWith(undefined, {
      skip: true,
    });
  });

  it('redirige vers onboarding lorsque la liste est vide et aucun contexte Platform actif n’existe', async () => {
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
