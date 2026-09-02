import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  reactivateWorkspace: vi.fn(),
  suspendWorkspace: vi.fn(),
  useGetPlatformWorkspaceQuery: vi.fn(),
  useListPlatformWorkspacesQuery: vi.fn(),
  useReactivatePlatformWorkspaceMutation: vi.fn(),
  useSuspendPlatformWorkspaceMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-workspaces-api', () => ({
  useGetPlatformWorkspaceQuery: mocks.useGetPlatformWorkspaceQuery,
  useListPlatformWorkspacesQuery: mocks.useListPlatformWorkspacesQuery,
  useReactivatePlatformWorkspaceMutation: mocks.useReactivatePlatformWorkspaceMutation,
  useSuspendPlatformWorkspaceMutation: mocks.useSuspendPlatformWorkspaceMutation,
}));

import { PlatformWorkspacesPage } from '@/features/platform/pages/platform-workspaces-page';

const listedWorkspace = {
  id: '507f1f77bcf86cd799439021',
  name: 'Workspace Démo',
  status: 'active',
  statusReason: null,
  statusChangedAt: '2026-09-01T08:30:00.000Z',
  createdBy: '507f1f77bcf86cd799439010',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-09-01T08:30:00.000Z',
};

const detailedWorkspace = {
  ...listedWorkspace,
  statusReasonDetails: null,
  statusChangedBy: '507f1f77bcf86cd799439010',
  updatedBy: '507f1f77bcf86cd799439010',
};

function resolvedMutation(mock, result = {}) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(result) });
  return [mock, { isLoading: false }];
}

function renderPage() {
  return render(
    <ToastProvider>
      <PlatformWorkspacesPage />
    </ToastProvider>,
  );
}

describe('PlatformWorkspacesPage', () => {
  beforeEach(() => {
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: {
        workspaces: [listedWorkspace],
        pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformWorkspaceQuery.mockReturnValue({
      data: detailedWorkspace,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useSuspendPlatformWorkspaceMutation.mockReturnValue(
      resolvedMutation(mocks.suspendWorkspace, { ...detailedWorkspace, status: 'suspended' }),
    );
    mocks.useReactivatePlatformWorkspaceMutation.mockReturnValue(
      resolvedMutation(mocks.reactivateWorkspace, detailedWorkspace),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche l’état de chargement', () => {
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText('Chargement des workspaces…')).toBeInTheDocument();
  });

  it('affiche les workspaces et pagine côté serveur', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Workspace Démo')).toBeInTheDocument();
    expect(within(table).getByText('Actif')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(mocks.useListPlatformWorkspacesQuery).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
  });

  it('affiche un état vide explicite', () => {
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: { workspaces: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText('Aucun workspace.')).toBeInTheDocument();
  });

  it('propose un retry lorsque la liste échoue', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isFetching: false,
      isLoading: false,
      refetch,
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('exige des détails pour le motif autre', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: 'Suspendre' }));

    const confirmation = screen.getByRole('dialog', { name: 'Confirmer l’action' });
    await user.selectOptions(
      within(confirmation).getByLabelText('Motif de suspension'),
      'other',
    );
    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    expect(screen.getByText('Précisez le motif en au moins 3 caractères.')).toBeInTheDocument();
    expect(mocks.suspendWorkspace).not.toHaveBeenCalled();
  });

  it('suspend un workspace avec un motif structuré', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: 'Suspendre' }));

    const confirmation = screen.getByRole('dialog', { name: 'Confirmer l’action' });
    await user.selectOptions(
      within(confirmation).getByLabelText('Motif de suspension'),
      'security_incident',
    );
    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.suspendWorkspace).toHaveBeenCalledWith({
        workspaceId: listedWorkspace.id,
        statusReason: 'security_incident',
        statusReasonDetails: undefined,
      });
    });
    expect(await screen.findByText('Workspace suspendu')).toBeInTheDocument();
  });

  it('réactive un workspace suspendu', async () => {
    const user = userEvent.setup();
    const suspendedWorkspace = {
      ...detailedWorkspace,
      status: 'suspended',
      statusReason: 'administrative_review',
      statusReasonDetails: 'Contrôle en cours',
    };
    mocks.useGetPlatformWorkspaceQuery.mockReturnValue({
      data: suspendedWorkspace,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: 'Réactiver' }));

    const confirmation = screen.getByRole('dialog', { name: 'Confirmer l’action' });
    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.reactivateWorkspace).toHaveBeenCalledWith(listedWorkspace.id);
    });
    expect(await screen.findByText('Workspace réactivé')).toBeInTheDocument();
  });
});
