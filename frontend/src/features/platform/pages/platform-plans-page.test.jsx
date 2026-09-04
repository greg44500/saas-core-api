import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  archivePlan: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  useArchivePlatformPlanMutation: vi.fn(),
  useCreatePlatformPlanMutation: vi.fn(),
  useListPlatformPlanCapabilitiesQuery: vi.fn(),
  useListPlatformPlansQuery: vi.fn(),
  useUpdatePlatformPlanMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-plans-api', () => ({
  useArchivePlatformPlanMutation: mocks.useArchivePlatformPlanMutation,
  useCreatePlatformPlanMutation: mocks.useCreatePlatformPlanMutation,
  useListPlatformPlanCapabilitiesQuery: mocks.useListPlatformPlanCapabilitiesQuery,
  useListPlatformPlansQuery: mocks.useListPlatformPlansQuery,
  useUpdatePlatformPlanMutation: mocks.useUpdatePlatformPlanMutation,
}));

import { PlatformPlansPage } from '@/features/platform/pages/platform-plans-page';

const plan = {
  id: '507f1f77bcf86cd799439031',
  isBaseline: false,
  name: 'Premium',
  description: 'Offre premium',
  status: 'active',
  isPublic: true,
  displayOrder: 10,
  trialEnabled: true,
  trialDurationDays: 14,
  currency: 'EUR',
  priceMonthlyExclTaxMinor: 7900,
  priceYearlyExclTaxMinor: 79000,
  features: ['file_upload', 'team_management'],
  limits: {
    members: 10,
    storage_bytes: 1073741824,
    file_uploads_monthly: 100,
  },
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-09-01T08:30:00.000Z',
};

const capabilities = {
  features: ['file_upload', 'team_management', 'audit_logs'],
  metrics: [
    { key: 'members', definition: {} },
    { key: 'storage_bytes', definition: {} },
    { key: 'file_uploads_monthly', definition: {} },
  ],
};

function resolvedMutation(mock, result = {}) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(result) });
  return [mock, { isLoading: false }];
}

function renderPage() {
  return render(
    <ToastProvider>
      <PlatformPlansPage />
    </ToastProvider>,
  );
}

describe('PlatformPlansPage', () => {
  beforeEach(() => {
    mocks.useListPlatformPlansQuery.mockReturnValue({
      data: {
        plans: [plan],
        pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPlatformPlanCapabilitiesQuery.mockReturnValue({
      data: capabilities,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useCreatePlatformPlanMutation.mockReturnValue(resolvedMutation(mocks.createPlan));
    mocks.useUpdatePlatformPlanMutation.mockReturnValue(resolvedMutation(mocks.updatePlan));
    mocks.useArchivePlatformPlanMutation.mockReturnValue(resolvedMutation(mocks.archivePlan));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche l’état de chargement', () => {
    mocks.useListPlatformPlansQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText('Chargement des plans…')).toBeInTheDocument();
  });

  it('affiche le DataTable sans identifiant technique et pagine côté serveur', async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Premium')).toBeInTheDocument();
    expect(within(table).getByText('Actif')).toBeInTheDocument();
    expect(within(table).getByText(/79,00\s*€/)).toBeInTheDocument();
    expect(within(table).getByText('14 jour(s)')).toBeInTheDocument();
    expect(within(table).queryByText('premium')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(mocks.useListPlatformPlansQuery).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
  });

  it('affiche un état vide explicite', () => {
    mocks.useListPlatformPlansQuery.mockReturnValue({
      data: { plans: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText('Aucun plan.')).toBeInTheDocument();
  });

  it('propose un retry lorsque la liste échoue', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useListPlatformPlansQuery.mockReturnValue({
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

  it('désactive création et modification si le registre est indisponible', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useListPlatformPlanCapabilitiesQuery.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isLoading: false,
      refetch,
    });

    renderPage();
    expect(screen.getByRole('button', { name: 'Créer un plan' })).toBeDisabled();
    expect(screen.getByText(/registre des fonctionnalités et limites n’est pas disponible/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('crée un plan sans demander ni envoyer de clé technique', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Créer un plan' }));
    const drawer = screen.getByRole('dialog', { name: 'Créer un plan' });
    expect(within(drawer).queryByLabelText('Clé technique')).not.toBeInTheDocument();
    await user.type(within(drawer).getByLabelText('Nom'), 'Starter');
    await user.click(within(drawer).getByRole('button', { name: 'Créer le plan' }));

    await waitFor(() => {
      expect(mocks.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Starter',
          trialEnabled: false,
          trialDurationDays: null,
          limits: {
            members: 0,
            storage_bytes: 0,
            file_uploads_monthly: 0,
          },
        }),
      );
    });
    expect(mocks.createPlan.mock.calls[0][0]).not.toHaveProperty('key');
    expect(await screen.findByText('Plan créé')).toBeInTheDocument();
  });

  it('ouvre les détails puis archive un plan ordinaire avec confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Premium' });
    expect(within(drawer).getByText('Offre premium')).toBeInTheDocument();
    expect(within(drawer).getByText('Gestion d’équipe')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Archiver' }));
    const confirmation = screen.getByRole('dialog', { name: 'Archiver le plan' });
    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(mocks.archivePlan).toHaveBeenCalledWith(plan.id);
    });
    expect(await screen.findByText('Plan archivé')).toBeInTheDocument();
  });

  it('ne propose pas l’archivage du plan de référence', async () => {
    const user = userEvent.setup();
    mocks.useListPlatformPlansQuery.mockReturnValue({
      data: {
        plans: [{ ...plan, id: 'baseline-id', isBaseline: true, name: 'Découverte' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText('Plan de référence')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Découverte' });
    expect(within(drawer).queryByRole('button', { name: 'Archiver' })).not.toBeInTheDocument();
  });

  it('ouvre le formulaire de modification depuis le drawer', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const drawer = screen.getByRole('dialog', { name: 'Premium' });
    await user.click(within(drawer).getByRole('button', { name: 'Modifier' }));

    expect(screen.getByRole('dialog', { name: 'Modifier le plan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toHaveValue('Premium');
    expect(screen.queryByLabelText('Clé technique')).not.toBeInTheDocument();
  });
});
