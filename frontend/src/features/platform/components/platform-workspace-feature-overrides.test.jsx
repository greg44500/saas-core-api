import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  createOverride: vi.fn(),
  revokeOverride: vi.fn(),
  useCreatePlatformEntitlementOverrideMutation: vi.fn(),
  useGetPlatformEntitlementContextQuery: vi.fn(),
  useRevokePlatformEntitlementOverrideMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-entitlement-overrides-api', () => ({
  useCreatePlatformEntitlementOverrideMutation: mocks.useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementContextQuery: mocks.useGetPlatformEntitlementContextQuery,
  useRevokePlatformEntitlementOverrideMutation: mocks.useRevokePlatformEntitlementOverrideMutation,
}));

import { PlatformWorkspaceFeatureOverrides } from '@/features/platform/components/platform-workspace-feature-overrides';

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
};

function mutationHook(mock) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  return [mock, { isLoading: false }];
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
    mocks.useGetPlatformEntitlementContextQuery.mockReturnValue({
      data: {
        workspace: { id: 'workspace-id', name: 'Workspace Démo' },
        plan: {
          id: 'plan-id',
          key: 'premium',
          name: 'Premium',
          features: ['file_upload'],
          limits: {},
        },
        effective: {
          features: ['file_upload'],
          limits: {},
        },
        appliedOverrides: [],
        nextEntitlementChangeAt: null,
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useCreatePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.createOverride),
    );
    mocks.useRevokePlatformEntitlementOverrideMutation.mockReturnValue(
      mutationHook(mocks.revokeOverride),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('verrouille une fonctionnalité incluse par défaut dans le plan', () => {
    renderComponent();

    const includedSwitch = screen.getByRole('switch', {
      name: 'Désactiver Téléversement de fichiers',
    });

    expect(includedSwitch).toHaveAttribute('aria-checked', 'true');
    expect(includedSwitch).toBeDisabled();
    expect(
      screen.getByText('Incluse par défaut dans le plan Premium'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Informations sur Téléversement de fichiers',
      }),
    ).toBeInTheDocument();
  });

  it('laisse modifiable une fonctionnalité absente du plan', async () => {
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

  it('révoque une dérogation positive lorsque le switch revient à off', async () => {
    const user = userEvent.setup();
    mocks.useGetPlatformEntitlementContextQuery.mockReturnValue({
      data: {
        workspace: { id: 'workspace-id', name: 'Workspace Démo' },
        plan: {
          id: 'plan-id',
          key: 'free',
          name: 'Free',
          features: [],
          limits: {},
        },
        effective: {
          features: ['team_management'],
          limits: {},
        },
        appliedOverrides: [{
          id: 'override-id',
          targetType: 'feature',
          featureKey: 'team_management',
          featureEnabled: true,
        }],
        nextEntitlementChangeAt: null,
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

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

  it('signale une désactivation exceptionnelle sans rendre le switch rapide éditable', () => {
    mocks.useGetPlatformEntitlementContextQuery.mockReturnValue({
      data: {
        workspace: { id: 'workspace-id', name: 'Workspace Démo' },
        plan: {
          id: 'plan-id',
          key: 'premium',
          name: 'Premium',
          features: ['file_upload'],
          limits: {},
        },
        effective: {
          features: [],
          limits: {},
        },
        appliedOverrides: [{
          id: 'override-negative',
          targetType: 'feature',
          featureKey: 'file_upload',
          featureEnabled: false,
        }],
        nextEntitlementChangeAt: null,
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderComponent();

    const includedSwitch = screen.getByRole('switch', {
      name: 'Activer Téléversement de fichiers',
    });
    expect(includedSwitch).toHaveAttribute('aria-checked', 'false');
    expect(includedSwitch).toBeDisabled();
    expect(
      screen.getByText('Incluse par défaut dans le plan Premium — désactivée par une dérogation exceptionnelle'),
    ).toBeInTheDocument();
  });
});
