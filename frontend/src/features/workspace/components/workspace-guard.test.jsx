import {
  act,
  cleanup,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { ToastProvider } from '@/components/shared/toast-provider';

const useGetWorkspaceByIdQueryMock = vi.hoisted(() => vi.fn());
const useEntitlementAutoRefreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useGetWorkspaceByIdQuery: useGetWorkspaceByIdQueryMock,
}));

// Le comportement temporel du hook possède son propre test avec fake timers.
// Ici, on vérifie seulement la réaction du WorkspaceGuard à un changement
// d'entitlement afin de ne pas coupler le router aux timers du navigateur.
vi.mock('@/hooks/use-entitlement-auto-refresh', () => ({
  useEntitlementAutoRefresh: useEntitlementAutoRefreshMock,
}));

import { WorkspaceGuard } from '@/features/workspace/components/workspace-guard';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function WorkspaceProbe() {
  const { can, membership, workspace } = useWorkspaceContext();

  return (
    <div>
      <h1>{workspace.name}</h1>
      <p>{membership.role.name}</p>
      <p>{can('member:read') ? 'Membres autorisés' : 'Membres interdits'}</p>
    </div>
  );
}

function MembersProbe() {
  return <h1>Membres</h1>;
}

function renderGuard(initialEntry = '/workspaces/workspace-1/dashboard') {
  const router = createMemoryRouter(
    [
      {
        path: '/workspaces/:workspaceId',
        Component: WorkspaceGuard,
        children: [
          { path: 'dashboard', Component: WorkspaceProbe },
          { path: 'members', Component: MembersProbe },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  );

  return router;
}

describe('WorkspaceGuard', () => {
  beforeEach(() => {
    useGetWorkspaceByIdQueryMock.mockReset();
    useEntitlementAutoRefreshMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('fournit le workspace, le membership et les permissions aux routes enfants', async () => {
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: {
        workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
        membership: {
          id: 'membership-1',
          role: { key: 'admin', name: 'Administrateur' },
        },
        permissions: ['workspace:read', 'member:read'],
        features: ['team_management'],
        nextEntitlementChangeAt: null,
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
    expect(useGetWorkspaceByIdQueryMock).toHaveBeenCalledWith('workspace-1', {
      skip: false,
    });
  });

  it('redirige vers le dashboard si une échéance retire la feature de la route courante', async () => {
    useGetWorkspaceByIdQueryMock.mockReturnValue({
      data: {
        workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
        membership: {
          id: 'membership-1',
          role: { key: 'admin', name: 'Administrateur' },
        },
        permissions: ['workspace:read', 'member:read'],
        features: ['team_management'],
        nextEntitlementChangeAt: '2026-09-04T12:00:10.000Z',
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const router = renderGuard('/workspaces/workspace-1/members');
    expect(screen.getByRole('heading', { name: 'Membres' })).toBeInTheDocument();

    const refreshOptions = useEntitlementAutoRefreshMock.mock.calls.at(-1)?.[0];
    expect(refreshOptions).toBeDefined();

    await act(async () => {
      refreshOptions.onChanged({
        data: {
          workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
          membership: {
            id: 'membership-1',
            role: { key: 'admin', name: 'Administrateur' },
          },
          permissions: ['workspace:read', 'member:read'],
          features: [],
          nextEntitlementChangeAt: null,
        },
        reason: 'schedule',
      });
    });

    expect(router.state.location.pathname).toBe(
      '/workspaces/workspace-1/dashboard',
    );
    expect(
      screen.getByText('Accès au workspace mis à jour'),
    ).toBeInTheDocument();
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