import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  createOverride: vi.fn(),
  revokeOverride: vi.fn(),
  updateOverride: vi.fn(),
  useCreatePlatformEntitlementOverrideMutation: vi.fn(),
  useGetPlatformEntitlementOverrideQuery: vi.fn(),
  useListPlatformEntitlementOverridesQuery: vi.fn(),
  useRevokePlatformEntitlementOverrideMutation: vi.fn(),
  useUpdatePlatformEntitlementOverrideMutation: vi.fn(),
  useListPlatformPlanCapabilitiesQuery: vi.fn(),
  useListPlatformWorkspacesQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-entitlement-overrides-api', () => ({
  useCreatePlatformEntitlementOverrideMutation: mocks.useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementOverrideQuery: mocks.useGetPlatformEntitlementOverrideQuery,
  useListPlatformEntitlementOverridesQuery: mocks.useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation: mocks.useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation: mocks.useUpdatePlatformEntitlementOverrideMutation,
}));

vi.mock('@/features/platform/api/platform-plans-api', () => ({
  useListPlatformPlanCapabilitiesQuery: mocks.useListPlatformPlanCapabilitiesQuery,
}));

vi.mock('@/features/platform/api/platform-workspaces-api', () => ({
  useListPlatformWorkspacesQuery: mocks.useListPlatformWorkspacesQuery,
}));

import { PlatformEntitlementOverridesPage } from '@/features/platform/pages/platform-entitlement-overrides-page';

const override = {
  id: 'override-id',
  workspace: { id: 'workspace-id', name: 'Workspace Démo' },
  targetType: 'feature',
  featureKey: 'file_upload',
  metricKey: null,
  featureEnabled: true,
  limitValue: null,
  source: 'support',
  startsAt: '2026-09-04T08:00:00.000Z',
  endsAt: null,
  lifecycle: 'active',
  reason: 'Accès support temporaire',
  grantedBy: { id: 'admin-id', firstName: 'Super', lastName: 'Admin' },
  updatedBy: null,
  revokedAt: null,
  revokedBy: null,
  revokeReason: null,
  createdAt: '2026-09-04T08:00:00.000Z',
  updatedAt: '2026-09-04T08:00:00.000Z',
};

const capabilities = {
  features: ['file_upload'],
  featureDefinitions: [{ key: 'file_upload', label: 'Téléversement de fichiers' }],
  metrics: [{ key: 'storage_bytes', presentation: { label: 'Stockage', unit: 'bytes' } }],
};

function mutationHook(mock) {
  mock.mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
  return [mock, { isLoading: false }];
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/platform/entitlement-overrides']}>
      <ToastProvider>
        <PlatformEntitlementOverridesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('PlatformEntitlementOverridesPage', () => {
  beforeEach(() => {
    mocks.useListPlatformEntitlementOverridesQuery.mockReturnValue({
      data: {
        overrides: [override],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformEntitlementOverrideQuery.mockReturnValue({
      data: override,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPlatformPlanCapabilitiesQuery.mockReturnValue({
      data: capabilities,
      error: undefined,
      isLoading: false,
    });
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: {
        workspaces: [{ id: 'workspace-id', name: 'Workspace Démo' }],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
      error: undefined,
      isLoading: false,
    });
    mocks.useCreatePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.createOverride),
    );
    mocks.useUpdatePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.updateOverride),
    );
    mocks.useRevokePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.revokeOverride),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche les dérogations dans le DataTable partagé', () => {
    renderPage();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Workspace Démo')).toBeInTheDocument();
    expect(within(table).getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(within(table).getByText('Activée')).toBeInTheDocument();
    expect(within(table).getByText('Active')).toBeInTheDocument();
  });

  it('rejoue la liste avec les filtres conservés dans l’URL', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText('Type'), 'feature');

    await waitFor(() => {
      expect(mocks.useListPlatformEntitlementOverridesQuery).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        workspaceId: undefined,
        targetType: 'feature',
        source: undefined,
      });
    });
  });

  it('crée une dérogation depuis le Drawer', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Nouvelle dérogation' }));
    const drawer = screen.getByRole('dialog', { name: 'Nouvelle dérogation' });

    await user.selectOptions(within(drawer).getByLabelText('Espace de travail'), 'workspace-id');
    await user.type(within(drawer).getByLabelText('Motif'), 'Accès support validé');
    await user.click(within(drawer).getByRole('button', { name: 'Créer la dérogation' }));

    await waitFor(() => {
      expect(mocks.createOverride).toHaveBeenCalledWith(expect.objectContaining({
        workspaceId: 'workspace-id',
        targetType: 'feature',
        featureKey: 'file_upload',
        featureEnabled: true,
        reason: 'Accès support validé',
      }));
    });
    expect(await screen.findByText('Dérogation créée')).toBeInTheDocument();
  });
});
