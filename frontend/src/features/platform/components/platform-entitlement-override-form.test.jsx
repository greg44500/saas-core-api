import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  EXCEPTION_KIND,
  PlatformEntitlementOverrideForm,
} from '@/features/platform/components/platform-entitlement-override-form';

const capabilities = {
  features: ['file_upload', 'team_management'],
  featureDefinitions: [
    { key: 'file_upload', label: 'Téléversement de fichiers' },
    { key: 'team_management', label: 'Gestion d’équipe' },
  ],
  metrics: [
    {
      key: 'storage_bytes',
      presentation: { label: 'Stockage', unit: 'bytes' },
    },
  ],
};

const entitlementContext = {
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
};

describe('PlatformEntitlementOverrideForm', () => {
  afterEach(() => cleanup());

  it('propose seulement les fonctionnalités compatibles avec la nature choisie', async () => {
    const user = userEvent.setup();

    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        entitlementContext={entitlementContext}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        workspaceId="workspace-id"
      />,
    );

    expect(screen.getByText('Workspace Démo')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Gestion d’équipe' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Téléversement de fichiers' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Nature'),
      EXCEPTION_KIND.SUSPEND_FEATURE,
    );

    expect(
      screen.getByRole('option', { name: 'Téléversement de fichiers' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Gestion d’équipe' }),
    ).not.toBeInTheDocument();
  });

  it('construit une dérogation exceptionnelle positive sur une feature inactive', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        entitlementContext={entitlementContext}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        workspaceId="workspace-id"
      />,
    );

    await user.type(screen.getByLabelText('Motif'), 'Geste de support validé');
    await user.click(
      screen.getByRole('button', {
        name: 'Créer la dérogation exceptionnelle',
      }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      source: 'administrative',
      reason: 'Geste de support validé',
      endsAt: null,
      workspaceId: 'workspace-id',
      targetType: 'feature',
      featureKey: 'team_management',
      featureEnabled: true,
    });
  });

  it('construit une suspension exceptionnelle sur une feature active', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        entitlementContext={entitlementContext}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        workspaceId="workspace-id"
      />,
    );

    await user.selectOptions(
      screen.getByLabelText('Nature'),
      EXCEPTION_KIND.SUSPEND_FEATURE,
    );
    await user.type(screen.getByLabelText('Motif'), 'Suspension contractuelle');
    await user.click(
      screen.getByRole('button', {
        name: 'Créer la dérogation exceptionnelle',
      }),
    );

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-id',
      targetType: 'feature',
      featureKey: 'file_upload',
      featureEnabled: false,
      reason: 'Suspension contractuelle',
    }));
  });
});
