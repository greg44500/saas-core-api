import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  createOverride: vi.fn(),
  createFeatureGroup: vi.fn(),
  revokeOverride: vi.fn(),
  updateOverride: vi.fn(),
  updateFeatureGroup: vi.fn(),
  useCreatePlatformEntitlementOverrideMutation: vi.fn(),
  useCreatePlatformFeatureOverrideGroupMutation: vi.fn(),
  useGetPlatformEntitlementContextQuery: vi.fn(),
  useGetPlatformEntitlementOverrideQuery: vi.fn(),
  useGetPlatformFeatureOverrideGroupQuery: vi.fn(),
  useListPlatformEntitlementOverridesQuery: vi.fn(),
  useRevokePlatformEntitlementOverrideMutation: vi.fn(),
  useUpdatePlatformEntitlementOverrideMutation: vi.fn(),
  useUpdatePlatformFeatureOverrideGroupMutation: vi.fn(),
  useListPlatformPlanCapabilitiesQuery: vi.fn(),
  useListPlatformWorkspacesQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-entitlement-overrides-api', () => ({
  useCreatePlatformEntitlementOverrideMutation: mocks.useCreatePlatformEntitlementOverrideMutation,
  useCreatePlatformFeatureOverrideGroupMutation: mocks.useCreatePlatformFeatureOverrideGroupMutation,
  useGetPlatformEntitlementContextQuery: mocks.useGetPlatformEntitlementContextQuery,
  useGetPlatformEntitlementOverrideQuery: mocks.useGetPlatformEntitlementOverrideQuery,
  useGetPlatformFeatureOverrideGroupQuery: mocks.useGetPlatformFeatureOverrideGroupQuery,
  useListPlatformEntitlementOverridesQuery: mocks.useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation: mocks.useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation: mocks.useUpdatePlatformEntitlementOverrideMutation,
  useUpdatePlatformFeatureOverrideGroupMutation: mocks.useUpdatePlatformFeatureOverrideGroupMutation,
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
  features: ['file_upload', 'team_management'],
  featureDefinitions: [
    {
      key: 'file_upload',
      label: 'Téléversement de fichiers',
      category: 'files',
      categoryLabel: 'Fichiers',
      metricKeys: ['storage_bytes'],
      overridePolicy: {
        requiredLimits: {
          storage_bytes: {
            minimumEffectiveValue: 100 * 1024 * 1024,
            minimumHeadroom: 1,
          },
        },
      },
    },
    {
      key: 'team_management',
      label: 'Gestion d’équipe',
      category: 'workspace',
      categoryLabel: 'Collaboration',
      metricKeys: ['members'],
      overridePolicy: {
        requiredLimits: {
          members: {
            minimumEffectiveValue: 2,
            minimumHeadroom: 1,
          },
        },
      },
    },
  ],
  metrics: [
    {
      key: 'storage_bytes',
      presentation: { label: 'Stockage', unit: 'bytes' },
      overridePolicy: {
        control: 'preset_slider',
        values: [0, 100 * 1024 * 1024, 500 * 1024 * 1024, 1024 * 1024 * 1024],
        allowUnlimited: false,
      },
    },
    {
      key: 'members',
      presentation: { label: 'Membres', unit: 'count' },
      overridePolicy: {
        control: 'linear_slider',
        min: 0,
        max: 50,
        step: 1,
        allowUnlimited: false,
      },
    },
  ],
};

function mutationHook(mock) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  return [mock, { isLoading: false }];
}

function renderPage(initialEntry = '/platform/entitlement-overrides') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    mocks.useGetPlatformFeatureOverrideGroupQuery.mockReturnValue({
      data: {
        groupId: null,
        groupName: null,
        featureKey: 'file_upload',
        primaryOverride: override,
        relatedOverrides: [],
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
    });
    mocks.useGetPlatformEntitlementContextQuery.mockImplementation((currentWorkspaceId) => ({
      data: currentWorkspaceId
        ? {
            workspace: { id: 'workspace-id', name: 'Workspace Démo' },
            plan: {
              id: 'plan-id',
              name: 'Free',
              features: ['file_upload'],
              limits: { members: 1 },
            },
            effective: {
              features: ['file_upload'],
              limits: { members: 1 },
            },
            usage: { members: 1 },
            appliedOverrides: [],
            nextEntitlementChangeAt: null,
          }
        : undefined,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    }));
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
    mocks.useCreatePlatformFeatureOverrideGroupMutation.mockReturnValue(
      mutationHook(mocks.createFeatureGroup),
    );
    mocks.useUpdatePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.updateOverride),
    );
    mocks.useUpdatePlatformFeatureOverrideGroupMutation.mockReturnValue(
      mutationHook(mocks.updateFeatureGroup),
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
        lifecycle: undefined,
      });
    });
  });

  it('applique le filtre lifecycle transmis par un drill-down du dashboard', () => {
    renderPage('/platform/entitlement-overrides?lifecycle=active');

    expect(screen.getByLabelText('État')).toHaveValue('active');
    expect(mocks.useListPlatformEntitlementOverridesQuery).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      workspaceId: undefined,
      targetType: undefined,
      source: undefined,
      lifecycle: 'active',
    });
  });

  it('affiche les réglages rapides lorsque le workspace est sélectionné', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('button', { name: 'Dérogation exceptionnelle' }),
    ).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Espace de travail'), 'workspace-id');

    expect(
      await screen.findByRole('heading', { name: 'Droits et limites du workspace' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Désactiver Téléversement de fichiers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dérogation exceptionnelle' }),
    ).not.toBeDisabled();
  });

  it('crée une dérogation groupée avec la limite associée requise', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText('Espace de travail'), 'workspace-id');
    await user.click(screen.getByRole('button', { name: 'Dérogation exceptionnelle' }));
    const drawer = screen.getByRole('dialog', { name: 'Dérogation exceptionnelle' });

    expect(within(drawer).getAllByText('Gestion d’équipe')).toHaveLength(2);
    expect(within(drawer).queryByText('Téléversement de fichiers')).not.toBeInTheDocument();
    expect(within(drawer).getByText('1 limite')).toBeInTheDocument();
    expect(within(drawer).getByText('Ajustement requis')).toBeInTheDocument();
    expect(within(drawer).getByRole('slider', { name: 'Limite Membres' })).toBeInTheDocument();
    expect(within(drawer).getByText(/Plan : 1 · Effectif : 1 · Utilisé : 1/)).toBeInTheDocument();

    await user.type(
      within(drawer).getByLabelText('Nom de la dérogation'),
      'Découverte équipe',
    );
    await user.type(within(drawer).getByLabelText('Motif'), 'Essai commercial validé');
    await user.click(
      within(drawer).getByRole('button', {
        name: 'Créer la dérogation exceptionnelle',
      }),
    );

    await waitFor(() => {
      expect(mocks.createFeatureGroup).toHaveBeenCalledWith(expect.objectContaining({
        workspaceId: 'workspace-id',
        featureKey: 'team_management',
        featureEnabled: true,
        groupName: 'Découverte équipe',
        relatedLimits: [{ metricKey: 'members', limitValue: 2 }],
        reason: 'Essai commercial validé',
      }));
    });
    expect(mocks.createOverride).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Dérogation exceptionnelle créée'),
    ).toBeInTheDocument();
  });
});
