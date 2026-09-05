import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  createOverride: vi.fn(),
  revokeOverride: vi.fn(),
  updateOverride: vi.fn(),
  useCreatePlatformEntitlementOverrideMutation: vi.fn(),
  useGetPlatformEntitlementContextQuery: vi.fn(),
  useRevokePlatformEntitlementOverrideMutation: vi.fn(),
  useUpdatePlatformEntitlementOverrideMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-entitlement-overrides-api', () => ({
  useCreatePlatformEntitlementOverrideMutation: mocks.useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementContextQuery: mocks.useGetPlatformEntitlementContextQuery,
  useRevokePlatformEntitlementOverrideMutation: mocks.useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation: mocks.useUpdatePlatformEntitlementOverrideMutation,
}));

import { PlatformWorkspaceFeatureOverrides } from '@/features/platform/components/platform-workspace-feature-overrides';

const MEBIBYTE = 1024 * 1024;

const capabilities = {
  features: ['file_upload', 'team_management'],
  featureDefinitions: [
    {
      key: 'file_upload',
      label: 'Téléversement de fichiers',
      description: 'Permet de téléverser des fichiers dans le workspace.',
    },
    {
      key: 'team_management',
      label: 'Gestion d’équipe',
      description: 'Permet d’administrer les membres du workspace.',
    },
  ],
  metrics: [
    {
      key: 'members',
      presentation: { label: 'Membres', unit: 'count' },
    },
    {
      key: 'storage_bytes',
      presentation: { label: 'Stockage', unit: 'bytes' },
    },
    {
      key: 'file_uploads_monthly',
      presentation: { label: 'Téléversements mensuels', unit: 'count' },
    },
  ],
};

function mutationHook(mock) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  return [mock, { isLoading: false }];
}

function makeContext(overrides = {}) {
  return {
    workspace: { id: 'workspace-id', name: 'Workspace Démo' },
    plan: {
      id: 'plan-id',
      name: 'Premium',
      features: ['file_upload'],
      limits: {
        members: 1,
        storage_bytes: 100 * MEBIBYTE,
        file_uploads_monthly: 10,
      },
      ...overrides.plan,
    },
    effective: {
      features: ['file_upload'],
      limits: {
        members: 1,
        storage_bytes: 100 * MEBIBYTE,
        file_uploads_monthly: 10,
      },
      ...overrides.effective,
    },
    appliedOverrides: overrides.appliedOverrides ?? [],
    nextEntitlementChangeAt: null,
  };
}

function setContext(data) {
  mocks.useGetPlatformEntitlementContextQuery.mockReturnValue({
    data,
    error: undefined,
    isLoading: false,
    refetch: vi.fn(),
  });
}

function renderComponent() {
  return render(
    <ToastProvider>
      <PlatformWorkspaceFeatureOverrides
        capabilities={capabilities}
        workspaceId="workspace-id"
      />
    </ToastProvider>,
  );
}

describe('PlatformWorkspaceFeatureOverrides', () => {
  beforeEach(() => {
    mocks.createOverride.mockReset();
    mocks.revokeOverride.mockReset();
    mocks.updateOverride.mockReset();
    setContext(makeContext());
    mocks.useCreatePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.createOverride),
    );
    mocks.useRevokePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.revokeOverride),
    );
    mocks.useUpdatePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.updateOverride),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('crée une dérogation négative lorsqu’une fonctionnalité du plan est désactivée', async () => {
    const user = userEvent.setup();
    renderComponent();

    const includedSwitch = screen.getByRole('switch', {
      name: 'Désactiver Téléversement de fichiers',
    });

    expect(includedSwitch).toHaveAttribute('aria-checked', 'true');
    expect(includedSwitch).not.toBeDisabled();
    expect(
      screen.getByText('Incluse par défaut dans le plan Premium'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Informations sur Téléversement de fichiers',
      }),
    ).toBeInTheDocument();

    await user.click(includedSwitch);

    await waitFor(() => {
      expect(mocks.createOverride).toHaveBeenCalledWith(expect.objectContaining({
        workspaceId: 'workspace-id',
        targetType: 'feature',
        featureKey: 'file_upload',
        featureEnabled: false,
        source: 'administrative',
        endsAt: null,
      }));
    });
  });

  it('crée une dérogation positive pour une fonctionnalité absente du plan', async () => {
    const user = userEvent.setup();
    renderComponent();

    const teamSwitch = screen.getByRole('switch', { name: 'Activer Gestion d’équipe' });
    expect(teamSwitch).toHaveAttribute('aria-checked', 'false');
    expect(teamSwitch).not.toBeDisabled();
    expect(screen.getByText('Non incluse dans le plan Premium')).toBeInTheDocument();

    await user.click(teamSwitch);

    await waitFor(() => {
      expect(mocks.createOverride).toHaveBeenCalledWith(expect.objectContaining({
        workspaceId: 'workspace-id',
        targetType: 'feature',
        featureKey: 'team_management',
        featureEnabled: true,
        source: 'administrative',
        endsAt: null,
      }));
    });
  });

  it('révoque une dérogation positive lorsque le switch revient à l’état du plan', async () => {
    const user = userEvent.setup();
    setContext(makeContext({
      plan: {
        id: 'plan-id',
        name: 'Free',
        features: [],
        limits: {
          members: 1,
          storage_bytes: 100 * MEBIBYTE,
          file_uploads_monthly: 10,
        },
      },
      effective: {
        features: ['team_management'],
        limits: {
          members: 1,
          storage_bytes: 100 * MEBIBYTE,
          file_uploads_monthly: 10,
        },
      },
      appliedOverrides: [{
        id: 'override-id',
        targetType: 'feature',
        featureKey: 'team_management',
        featureEnabled: true,
      }],
    }));

    renderComponent();
    expect(screen.getByText('Ajoutée par dérogation pour ce workspace')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Désactiver Gestion d’équipe' }));

    await waitFor(() => {
      expect(mocks.revokeOverride).toHaveBeenCalledWith(expect.objectContaining({
        overrideId: 'override-id',
        workspaceId: 'workspace-id',
      }));
    });
  });

  it('révoque une dérogation négative lorsque le switch revient à l’état du plan', async () => {
    const user = userEvent.setup();
    setContext(makeContext({
      effective: {
        features: [],
        limits: {
          members: 1,
          storage_bytes: 100 * MEBIBYTE,
          file_uploads_monthly: 10,
        },
      },
      appliedOverrides: [{
        id: 'override-negative',
        targetType: 'feature',
        featureKey: 'file_upload',
        featureEnabled: false,
      }],
    }));

    renderComponent();

    const includedSwitch = screen.getByRole('switch', {
      name: 'Activer Téléversement de fichiers',
    });
    expect(includedSwitch).toHaveAttribute('aria-checked', 'false');
    expect(includedSwitch).not.toBeDisabled();
    expect(
      screen.getByText('Incluse par défaut dans le plan Premium — désactivée par une dérogation exceptionnelle'),
    ).toBeInTheDocument();

    await user.click(includedSwitch);

    await waitFor(() => {
      expect(mocks.revokeOverride).toHaveBeenCalledWith(expect.objectContaining({
        overrideId: 'override-negative',
        workspaceId: 'workspace-id',
      }));
    });
  });

  it('affiche distinctement les valeurs du plan, les dérogations et les limites effectives', () => {
    renderComponent();

    expect(screen.getByRole('columnheader', { name: 'Plan Premium' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Dérogation' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Effectif' })).toBeInTheDocument();
    expect(screen.getByText('Stockage')).toBeInTheDocument();
    expect(screen.getAllByText('100 Mo').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Ajuster Stockage' })).toBeInTheDocument();
  });

  it('crée une dérogation de stockage depuis le réglage rapide', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Ajuster Stockage' }));

    const input = screen.getByLabelText('Limite en Mo');
    await user.clear(input);
    await user.type(input, '250');
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));

    await waitFor(() => {
      expect(mocks.createOverride).toHaveBeenCalledWith(expect.objectContaining({
        workspaceId: 'workspace-id',
        targetType: 'limit',
        metricKey: 'storage_bytes',
        limitValue: 250 * MEBIBYTE,
        source: 'administrative',
        endsAt: null,
      }));
    });
  });

  it('met à jour une dérogation de limite déjà active', async () => {
    const user = userEvent.setup();
    setContext(makeContext({
      effective: {
        features: ['file_upload'],
        limits: {
          members: 1,
          storage_bytes: 200 * MEBIBYTE,
          file_uploads_monthly: 10,
        },
      },
      appliedOverrides: [{
        id: 'storage-override',
        targetType: 'limit',
        metricKey: 'storage_bytes',
        limitValue: 200 * MEBIBYTE,
      }],
    }));

    renderComponent();
    await user.click(screen.getByRole('button', { name: 'Ajuster Stockage' }));

    const input = screen.getByLabelText('Limite en Mo');
    await user.clear(input);
    await user.type(input, '300');
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));

    await waitFor(() => {
      expect(mocks.updateOverride).toHaveBeenCalledWith(expect.objectContaining({
        overrideId: 'storage-override',
        workspaceId: 'workspace-id',
        limitValue: 300 * MEBIBYTE,
        source: 'administrative',
      }));
    });
  });

  it('révoque une dérogation de limite pour revenir à la valeur du plan', async () => {
    const user = userEvent.setup();
    setContext(makeContext({
      effective: {
        features: ['file_upload'],
        limits: {
          members: 1,
          storage_bytes: 200 * MEBIBYTE,
          file_uploads_monthly: 10,
        },
      },
      appliedOverrides: [{
        id: 'storage-override',
        targetType: 'limit',
        metricKey: 'storage_bytes',
        limitValue: 200 * MEBIBYTE,
      }],
    }));

    renderComponent();
    await user.click(screen.getByRole('button', { name: 'Revenir au plan pour Stockage' }));
    await user.click(screen.getByRole('button', { name: 'Revenir au plan' }));

    await waitFor(() => {
      expect(mocks.revokeOverride).toHaveBeenCalledWith(expect.objectContaining({
        overrideId: 'storage-override',
        workspaceId: 'workspace-id',
      }));
    });
  });
});
