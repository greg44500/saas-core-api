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
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';

function WorkspaceProbe() {
  const {
    can,
    hasFeature,
    membership,
    workspace,
  } = useWorkspaceContext();

  return (
    <div>
      <h1>{workspace.name}</h1>
      <p>{membership.role.name}</p>
      <p>{can('member:read') ? 'Membres autorisés' : 'Membres interdits'}</p>
      <p>{hasFeature(WORKSPACE_FEATURE.TEAM_MANAGEMENT) ? 'Équipe disponible' : 'Équipe indisponible'}</p>
    </div>
  );
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

  it('fournit le workspace, le membership, les permissions et les features aux routes enfants', async () => {
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: {
        workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
        membership: {
          id: 'membership-1',
          role: { key: 'admin', name: 'Administrateur' },
        },
        permissions: ['workspace:read', 'member:read'],
        features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderGuard();

    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByText('Administrateur')).toBeInTheDocument();
    expect(screen.getByText('Membres autorisés')).toBeInTheDocument();
    expect(screen.getByText('Équipe disponible')).toBeInTheDocument();
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
