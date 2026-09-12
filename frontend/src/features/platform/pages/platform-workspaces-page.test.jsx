import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { ToastProvider } from '@/components/shared/toast-provider';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  authorizeOwnershipTransfer: vi.fn(),
  reactivateWorkspace: vi.fn(),
  revokeOwnershipTransfer: vi.fn(),
  suspendWorkspace: vi.fn(),
  useAuthorizePlatformWorkspaceOwnershipTransferMutation: vi.fn(),
  useGetCurrentPlatformContextQuery: vi.fn(),
  useGetPlatformWorkspaceOwnershipTransferAuthorizationQuery: vi.fn(),
  useGetPlatformWorkspaceQuery: vi.fn(),
  useListPlatformWorkspacesQuery: vi.fn(),
  useReactivatePlatformWorkspaceMutation: vi.fn(),
  useRevokePlatformWorkspaceOwnershipTransferAuthorizationMutation: vi.fn(),
  useSuspendPlatformWorkspaceMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useGetCurrentPlatformContextQuery,
}));

vi.mock('@/features/platform/api/platform-workspaces-api', () => ({
  useAuthorizePlatformWorkspaceOwnershipTransferMutation:
    mocks.useAuthorizePlatformWorkspaceOwnershipTransferMutation,
  useGetPlatformWorkspaceOwnershipTransferAuthorizationQuery:
    mocks.useGetPlatformWorkspaceOwnershipTransferAuthorizationQuery,
  useGetPlatformWorkspaceQuery: mocks.useGetPlatformWorkspaceQuery,
  useListPlatformWorkspacesQuery: mocks.useListPlatformWorkspacesQuery,
  useReactivatePlatformWorkspaceMutation: mocks.useReactivatePlatformWorkspaceMutation,
  useRevokePlatformWorkspaceOwnershipTransferAuthorizationMutation:
    mocks.useRevokePlatformWorkspaceOwnershipTransferAuthorizationMutation,
  useSuspendPlatformWorkspaceMutation: mocks.useSuspendPlatformWorkspaceMutation,
}));

import { PlatformWorkspacesPage } from '@/features/platform/pages/platform-workspaces-page';

const actor = {
  id: '507f1f77bcf86cd799439010',
  firstName: 'Greg',
  lastName: 'Martin',
  email: 'greg@example.com',
};

const listedWorkspace = {
  id: '507f1f77bcf86cd799439021',
  name: 'Workspace Démo',
  status: 'active',
  statusReason: null,
  statusChangedAt: '2026-09-01T08:30:00.000Z',
  createdBy: actor.id,
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-09-01T08:30:00.000Z',
};

const detailedWorkspace = {
  ...listedWorkspace,
  statusReasonDetails: null,
  statusChangedBy: actor,
  createdBy: actor,
  updatedBy: actor,
};

function resolvedMutation(mock, result = {}) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(result) });
  return [mock, { isLoading: false }];
}

function renderPage(initialEntry = '/platform/workspaces') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <PlatformWorkspacesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function selectReason(user, reasonLabel) {
  await user.click(screen.getByLabelText('Motif de suspension'));
  await user.click(await screen.findByRole('option', { name: reasonLabel }));
}

describe('PlatformWorkspacesPage', () => {
  beforeEach(() => {
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: {
        permissions: [PLATFORM_PERMISSION.WORKSPACES_OWNERSHIP_TRANSFER_AUTHORIZE],
      },
    });
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
    mocks.useGetPlatformWorkspaceQuery.mockImplementation((workspaceId) => ({
      data: workspaceId ? detailedWorkspace : undefined,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    }));
    mocks.useGetPlatformWorkspaceOwnershipTransferAuthorizationQuery.mockReturnValue({
      data: { id: null, active: false, status: 'inactive', ttlHours: 24 },
      isFetching: false,
      isLoading: false,
    });
    mocks.useSuspendPlatformWorkspaceMutation.mockReturnValue(
      resolvedMutation(mocks.suspendWorkspace, { ...detailedWorkspace, status: 'suspended' }),
    );
    mocks.useReactivatePlatformWorkspaceMutation.mockReturnValue(
      resolvedMutation(mocks.reactivateWorkspace, detailedWorkspace),
    );
    mocks.useAuthorizePlatformWorkspaceOwnershipTransferMutation.mockReturnValue(
      resolvedMutation(mocks.authorizeOwnershipTransfer, {
        id: 'authorization-id',
        active: true,
        expiresAt: '2026-09-13T12:00:00.000Z',
      }),
    );
    mocks.useRevokePlatformWorkspaceOwnershipTransferAuthorizationMutation.mockReturnValue(
      resolvedMutation(mocks.revokeOwnershipTransfer, {
        id: 'authorization-id',
        active: false,
        status: 'revoked',
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche le skeleton du tableau au chargement', () => {
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText('Chargement du tableau…')).toBeInTheDocument();
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

  it('ouvre directement la fiche workspace indiquée dans l’URL', () => {
    renderPage(`/platform/workspaces?workspaceId=${listedWorkspace.id}`);

    expect(mocks.useGetPlatformWorkspaceQuery).toHaveBeenCalledWith(
      listedWorkspace.id,
      { skip: false },
    );
    expect(screen.getByRole('dialog', { name: 'Workspace Démo' })).toBeInTheDocument();
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

  it('affiche les acteurs lisibles sans exposer leurs identifiants techniques', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });

    expect(within(drawer).getAllByText('Greg Martin')).toHaveLength(3);
    expect(within(drawer).getAllByText('greg@example.com')).toHaveLength(3);
    expect(within(drawer).queryByText(`ID : ${actor.id}`)).not.toBeInTheDocument();
  });

  it('exige des détails pour le motif autre avec le Select canonique', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: 'Suspendre' }));

    await selectReason(user, 'Autre motif');
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(screen.getByText('Précisez le motif en au moins 3 caractères.')).toBeInTheDocument();
    expect(mocks.suspendWorkspace).not.toHaveBeenCalled();
  });

  it('suspend un workspace avec un motif structuré', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: 'Suspendre' }));

    await selectReason(user, 'Incident de sécurité');
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

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
    mocks.useGetPlatformWorkspaceQuery.mockImplementation((workspaceId) => ({
      data: workspaceId ? suspendedWorkspace : undefined,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    }));

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', { name: 'Réactiver' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.reactivateWorkspace).toHaveBeenCalledWith(listedWorkspace.id);
    });
    expect(await screen.findByText('Workspace réactivé')).toBeInTheDocument();
  });

  it('permet uniquement au contexte possédant la permission réservée d’autoriser temporairement le transfert', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', {
      name: 'Autoriser temporairement le transfert',
    }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.authorizeOwnershipTransfer).toHaveBeenCalledWith(listedWorkspace.id);
    });
    expect(await screen.findByText('Transfert de propriété temporairement autorisé')).toBeInTheDocument();
  });

  it('masque entièrement la capacité exceptionnelle sans permission réservée', async () => {
    const user = userEvent.setup();
    mocks.useGetCurrentPlatformContextQuery.mockReturnValue({
      data: { permissions: [] },
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });

    expect(within(drawer).queryByText('Capacité opérationnelle exceptionnelle')).not.toBeInTheDocument();
    expect(
      mocks.useGetPlatformWorkspaceOwnershipTransferAuthorizationQuery,
    ).toHaveBeenCalledWith(
      listedWorkspace.id,
      { skip: true },
    );
  });

  it('révoque une autorisation active', async () => {
    const user = userEvent.setup();
    mocks.useGetPlatformWorkspaceOwnershipTransferAuthorizationQuery.mockReturnValue({
      data: {
        id: 'authorization-id',
        active: true,
        status: 'active',
        expiresAt: '2026-09-13T12:00:00.000Z',
      },
      isFetching: false,
      isLoading: false,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(drawer).getByRole('button', {
      name: 'Révoquer l’autorisation de transfert',
    }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.revokeOwnershipTransfer).toHaveBeenCalledWith(listedWorkspace.id);
    });
    expect(await screen.findByText('Autorisation de transfert révoquée')).toBeInTheDocument();
  });
});
