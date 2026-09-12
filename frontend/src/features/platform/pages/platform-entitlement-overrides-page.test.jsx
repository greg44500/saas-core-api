import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  createOverride: vi.fn(),
  createFeatureGroup: vi.fn(),
  revokeOverride: vi.fn(),
  revokeFeatureGroup: vi.fn(),
  updateOverride: vi.fn(),
  updateFeatureGroup: vi.fn(),
  useCreatePlatformEntitlementOverrideMutation: vi.fn(),
  useCreatePlatformFeatureOverrideGroupMutation: vi.fn(),
  useGetPlatformEntitlementContextQuery: vi.fn(),
  useGetPlatformEntitlementOverrideQuery: vi.fn(),
  useGetPlatformFeatureOverrideGroupQuery: vi.fn(),
  useListPlatformEntitlementOverridesQuery: vi.fn(),
  useRevokePlatformEntitlementOverrideMutation: vi.fn(),
  useRevokePlatformFeatureOverrideGroupMutation: vi.fn(),
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
  useRevokePlatformFeatureOverrideGroupMutation: mocks.useRevokePlatformFeatureOverrideGroupMutation,
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
  groupId: 'group-id',
  groupName: 'Accès fichiers',
  relatedOverrides: [
    {
      id: 'storage-limit-id',
      targetType: 'limit',
      metricKey: 'storage_bytes',
      limitValue: 100 * 1024 * 1024,
      lifecycle: 'active',
    },
  ],
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
      description: 'Permet de téléverser des fichiers.',
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
      description: 'Permet d’administrer les membres du workspace.',
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
      <TooltipProvider>
        <ToastProvider>
          <PlatformEntitlementOverridesPage />
        </ToastProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

async function chooseSelectOption(user, label, optionName) {
  const trigger = screen.getByRole('combobox', { name: label });
  trigger.focus();
  await user.keyboard('{ArrowDown}');
  await user.click(await screen.findByRole('option', { name: optionName }));
}

describe('PlatformEntitlementOverridesPage', () => {
  beforeEach(() => {
    mocks.useListPlatformEntitlementOverridesQuery.mockReturnValue({
      data: {
        overrides: [override],
        pagination: { page: 1, limit: 10, total: 11, totalPages: 2 },
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
        groupId: 'group-id',
        groupName: 'Accès fichiers',
        featureKey: 'file_upload',
        primaryOverride: override,
        relatedOverrides: override.relatedOverrides,
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
              limits: { members: 1, storage_bytes: 100 * 1024 * 1024 },
            },
            effective: {
              features: ['file_upload'],
              limits: { members: 1, storage_bytes: 100 * 1024 * 1024 },
            },
            usage: { members: 1, storage_bytes: 0 },
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
    mocks.useRevokePlatformFeatureOverrideGroupMutation.mockReturnValue(
      mutationHook(mocks.revokeFeatureGroup),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche un tableau métier compact sans colonnes Type ni Valeur', () => {
    renderPage();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Workspace Démo')).toBeInTheDocument();
    expect(within(table).getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(within(table).getByText('Active')).toBeInTheDocument();
    expect(within(table).getByText('Permanente')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Fonctionnalité' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Statut' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Période' })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Type' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Valeur' })).not.toBeInTheDocument();
  });

  it('conserve les filtres utiles dans l’URL et utilise 10 lignes par défaut', async () => {
    const user = userEvent.setup();
    renderPage();

    await chooseSelectOption(user, 'Origine', 'Support');

    await waitFor(() => {
      expect(mocks.useListPlatformEntitlementOverridesQuery).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        workspaceId: undefined,
        source: 'support',
        lifecycle: undefined,
      });
    });
  });

  it('applique le filtre de statut transmis par un drill-down', () => {
    renderPage('/platform/entitlement-overrides?lifecycle=active');

    expect(screen.getByRole('combobox', { name: 'Statut' })).toHaveTextContent('Active');
    expect(mocks.useListPlatformEntitlementOverridesQuery).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      workspaceId: undefined,
      source: undefined,
      lifecycle: 'active',
    });
  });

  it('permet de choisir le nombre de lignes par page', async () => {
    const user = userEvent.setup();
    renderPage();

    await chooseSelectOption(user, 'Nombre de lignes par page', '20');

    await waitFor(() => {
      expect(mocks.useListPlatformEntitlementOverridesQuery).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        workspaceId: undefined,
        source: undefined,
        lifecycle: undefined,
      });
    });
  });

  it('affiche la synthèse des fonctionnalités actives lorsque le workspace est sélectionné', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('button', { name: 'Dérogation exceptionnelle' }),
    ).toBeDisabled();

    await chooseSelectOption(user, 'Espace de travail', 'Workspace Démo');

    expect(
      await screen.findByRole('heading', { name: 'Fonctionnalités actives' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dérogation exceptionnelle' }),
    ).not.toBeDisabled();
  });

  it('expose les paramètres associés au survol de la fonctionnalité', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.hover(screen.getByRole('button', {
      name: 'Informations sur Téléversement de fichiers',
    }));

    expect(await screen.findByText('Paramètres associés')).toBeInTheDocument();
    expect(screen.getByText(/Stockage : 100 Mo/)).toBeInTheDocument();
  });

  it('crée une dérogation groupée avec la limite associée requise', async () => {
    const user = userEvent.setup();
    renderPage();

    await chooseSelectOption(user, 'Espace de travail', 'Workspace Démo');
    await user.click(screen.getByRole('button', { name: 'Dérogation exceptionnelle' }));
    const drawer = screen.getByRole('dialog', { name: 'Dérogation exceptionnelle' });

    expect(within(drawer).getAllByText('Gestion d’équipe')).toHaveLength(2);
    expect(within(drawer).queryByText('Téléversement de fichiers')).not.toBeInTheDocument();
    expect(within(drawer).getByText('1 limite')).toBeInTheDocument();
    expect(within(drawer).getByText('Ajustement requis')).toBeInTheDocument();
    expect(within(drawer).getByRole('slider', { name: 'Limite Membres' })).toBeInTheDocument();

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
  });

  it('révoque une dérogation groupée via la mutation de groupe', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const detailsDrawer = await screen.findByRole('dialog', { name: 'Accès fichiers' });
    await user.click(within(detailsDrawer).getByRole('button', { name: 'Révoquer' }));

    const revokeDialog = screen.getByRole('dialog', { name: 'Révoquer la dérogation ?' });
    await user.type(
      within(revokeDialog).getByLabelText('Motif de révocation'),
      'Fin de l’exception commerciale',
    );
    await user.click(within(revokeDialog).getByRole('button', { name: 'Révoquer' }));

    await waitFor(() => {
      expect(mocks.revokeFeatureGroup).toHaveBeenCalledWith({
        overrideId: 'override-id',
        workspaceId: 'workspace-id',
        reason: 'Fin de l’exception commerciale',
      });
    });
    expect(mocks.revokeOverride).not.toHaveBeenCalled();
  });
});