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
    {
      key: 'file_upload',
      label: 'Téléversement de fichiers',
      category: 'files',
      categoryLabel: 'Fichiers',
      metricKeys: ['storage_bytes'],
    },
    {
      key: 'team_management',
      label: 'Gestion d’équipe',
      category: 'workspace',
      categoryLabel: 'Collaboration',
      metricKeys: ['members'],
    },
  ],
  metrics: [
    {
      key: 'storage_bytes',
      presentation: { label: 'Stockage', unit: 'bytes' },
    },
    {
      key: 'members',
      presentation: { label: 'Membres', unit: 'count' },
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
    limits: { members: 1 },
  },
  effective: {
    features: ['file_upload'],
    limits: { members: 1 },
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
    expect(screen.getByText('Gestion d’équipe')).toBeInTheDocument();
    expect(screen.queryByText('Téléversement de fichiers')).not.toBeInTheDocument();
    expect(screen.getByText('Collaboration')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Nature'),
      EXCEPTION_KIND.SUSPEND_FEATURE,
    );

    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.queryByText('Gestion d’équipe')).not.toBeInTheDocument();
  });

  it('construit une dérogation groupée avec le quota associé sélectionné', async () => {
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

    await user.type(
      screen.getByLabelText('Nom de la dérogation'),
      'Découverte équipe',
    );
    await user.click(screen.getByLabelText('Ajuster cette limite'));
    const limitInput = screen.getByLabelText('Limite');
    await user.clear(limitInput);
    await user.type(limitInput, '5');
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
      groupName: 'Découverte équipe',
      relatedLimits: [
        { metricKey: 'members', limitValue: 5 },
      ],
    });
  });

  it('permet de conserver le quota effectif sans créer de dérogation de limite', async () => {
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

    expect(screen.getByText(/Plan : 1 · Effectif : 1/)).toBeInTheDocument();
    expect(screen.getByText(/valeur effective actuelle sera conservée/i)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Nom de la dérogation'),
      'Accès équipe temporaire',
    );
    await user.type(screen.getByLabelText('Motif'), 'Test sans modification de quota');
    await user.click(
      screen.getByRole('button', {
        name: 'Créer la dérogation exceptionnelle',
      }),
    );

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      featureKey: 'team_management',
      relatedLimits: [],
    }));
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
