import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGetPlatformEntitlementContextQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-entitlement-overrides-api', () => ({
  useGetPlatformEntitlementContextQuery: mocks.useGetPlatformEntitlementContextQuery,
}));

import { TooltipProvider } from '@/components/ui/tooltip';
import { PlatformWorkspaceFeatureOverrides } from '@/features/platform/components/platform-workspace-feature-overrides';

const MEBIBYTE = 1024 * 1024;

const capabilities = {
  features: ['file_upload', 'team_management'],
  featureDefinitions: [
    {
      key: 'file_upload',
      label: 'Téléversement de fichiers',
      description: 'Permet de téléverser des fichiers dans le workspace.',
      metricKeys: ['storage_bytes', 'file_uploads_monthly'],
    },
    {
      key: 'team_management',
      label: 'Gestion d’équipe',
      description: 'Permet d’administrer les membres du workspace.',
      metricKeys: ['members'],
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

const context = {
  workspace: { id: 'workspace-id', name: 'Workspace Démo' },
  plan: {
    id: 'plan-id',
    name: 'Free',
    features: ['file_upload'],
    limits: {
      members: 1,
      storage_bytes: 100 * MEBIBYTE,
      file_uploads_monthly: 10,
    },
  },
  effective: {
    features: ['file_upload', 'team_management'],
    limits: {
      members: 6,
      storage_bytes: 100 * MEBIBYTE,
      file_uploads_monthly: 10,
    },
  },
  usage: {
    members: 2,
    storage_bytes: 20 * MEBIBYTE,
    file_uploads_monthly: 3,
  },
  appliedOverrides: [
    {
      id: 'team-group-primary',
      groupId: 'group-id',
      groupName: 'Découverte équipe',
      targetType: 'feature',
      featureKey: 'team_management',
      featureEnabled: true,
    },
  ],
};

function renderComponent() {
  return render(
    <TooltipProvider>
      <PlatformWorkspaceFeatureOverrides
        capabilities={capabilities}
        workspaceId="workspace-id"
      />
    </TooltipProvider>,
  );
}

describe('PlatformWorkspaceFeatureOverrides', () => {
  beforeEach(() => {
    mocks.useGetPlatformEntitlementContextQuery.mockReturnValue({
      data: context,
      error: undefined,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche uniquement une synthèse des fonctionnalités effectives, ouverte par défaut', () => {
    renderComponent();

    expect(screen.getByText('Fonctionnalités actives')).toBeInTheDocument();
    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Gestion d’équipe')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(screen.getByText('Source : Plan Free')).toBeInTheDocument();
    expect(screen.getByText('Source : Dérogation « Découverte équipe »')).toBeInTheDocument();
  });

  it('associe les limites utiles à chaque fonctionnalité active', () => {
    renderComponent();

    expect(screen.getByText(/Membres :/)).toBeInTheDocument();
    expect(screen.getByText(/6 · 2 utilisés/)).toBeInTheDocument();
    expect(screen.getByText(/Stockage :/)).toBeInTheDocument();
    expect(screen.getByText(/100 Mo · 20 Mo utilisé/)).toBeInTheDocument();
    expect(screen.getByText(/Téléversements mensuels :/)).toBeInTheDocument();
  });

  it('rend la description via le Tooltip partagé', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.hover(screen.getByRole('button', {
      name: 'Informations sur Gestion d’équipe',
    }));

    expect(await screen.findByText('Permet d’administrer les membres du workspace.'))
      .toBeInTheDocument();
  });
});
