import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useGetWorkspaceByIdQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useGetWorkspaceByIdQuery: useGetWorkspaceByIdQueryMock,
}));

import { WorkspaceGuard } from '@/features/workspace/components/workspace-guard';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function WorkspaceProbe() {
  const { workspace } = useWorkspaceContext();
  return <h1>{workspace.name}</h1>;
}

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        path: '/workspaces/:workspaceId',
        Component: WorkspaceGuard,
        children: [{ path: 'dashboard', Component: WorkspaceProbe }],
      },
    ],
    { initialEntries: ['/workspaces/workspace-1/dashboard'] },
  );

  render(<RouterProvider router={router} />);
}

describe('WorkspaceGuard', () => {
  beforeEach(() => {
    useGetWorkspaceByIdQueryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('fournit le workspace chargé aux routes enfants', async () => {
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: { id: 'workspace-1', name: 'Acme', status: 'active' },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(useGetWorkspaceByIdQueryMock).toHaveBeenCalledWith('workspace-1', {
      skip: false,
    });
  });

  it('affiche un état interdit sur une réponse 403', async () => {
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: undefined,
      error: { status: 403 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
  });

  it('affiche un état introuvable sur une réponse 404', async () => {
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByRole('heading', { name: 'Espace introuvable' })).toBeInTheDocument();
  });
});
