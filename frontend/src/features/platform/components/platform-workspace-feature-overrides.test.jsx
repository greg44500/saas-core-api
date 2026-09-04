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

const capabilities = {
  features: ['file_upload', 'team_management'],
  featureDefinitions: [
    { key: 'file_upload', label: 'Téléversement de fichiers' },
    { key: 'team_management', label: 'Gestion d’équipe' },
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
          key: 'free',
          name: 'Free',
          features: ['file_upload'],
          limits: {},
        },
        effective: {
          features: ['file_upload'],
          limits: {},
        },
        appliedOverrides: [],
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
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

  it('représente l’état effectif avec les switches réutilisables', () => {
    renderComponent();

    expect(
      screen.getByRole('switch', { name: 'Désactiver Téléversement de fichiers' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('switch', { name: 'Activer Gestion d’équipe' }),
    ).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Plan Free : incluse')).toBeInTheDocument();
    expect(screen.getByText('Plan Free : non incluse')).toBeInTheDocument();
  });

  it('crée une exception rapide uniquement lorsque le nouvel état diffère du plan', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('switch', { name: 'Activer Gestion d’équipe' }));

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

  it('révoque l’override actif lorsque le switch revient à l’état du plan', async () => {
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
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderComponent();
    await user.click(screen.getByRole('switch', { name: 'Désactiver Gestion d’équipe' }));

    await waitFor(() => {
      expect(mocks.revokeOverride).toHaveBeenCalledWith(expect.objectContaining({
        overrideId: 'override-id',
        workspaceId: 'workspace-id',
      }));
    });
  });
});
