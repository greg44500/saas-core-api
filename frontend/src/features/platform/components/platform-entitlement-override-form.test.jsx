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
      description: 'Permet de téléverser des fichiers.',
      category: 'files',
      categoryLabel: 'Fichiers',
      metricKeys: ['storage_bytes'],
      overridePolicy: {
        requiredLimits: {
          storage_bytes: {
            minimumEffectiveValue: 100 * 1024 * 1024,
            minimumHeadroom: 5 * 1024 * 1024,
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
        values: [
          0,
          100 * 1024 * 1024,
          500 * 1024 * 1024,
          1024 * 1024 * 1024,
        ],
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
  usage: { members: 1 },
  appliedOverrides: [],
};

const entitlementContextWithCapacity = {
  ...entitlementContext,
  plan: {
    ...entitlementContext.plan,
    limits: { members: 5 },
  },
  effective: {
    ...entitlementContext.effective,
    limits: { members: 5 },
  },
  usage: { members: 4 },
};

const entitlementContextWithSaturatedCapacity = {
  ...entitlementContextWithCapacity,
  usage: { members: 5 },
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
    expect(screen.getAllByText('Gestion d’équipe')).toHaveLength(2);
    expect(screen.queryByText('Téléversement de fichiers')).not.toBeInTheDocument();
    expect(screen.getByText('Collaboration')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Nature'),
      EXCEPTION_KIND.SUSPEND_FEATURE,
    );

    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.queryByText('Gestion d’équipe')).not.toBeInTheDocument();
  });

  it('rend automatiquement utilisable une feature dont la limite actuelle est saturée', async () => {
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

    expect(screen.getAllByText('1 limite associée')).toHaveLength(2);
    expect(screen.getByText('Ajustement requis')).toBeInTheDocument();
    expect(screen.getByText(/capacité restante est insuffisante/i)).toBeInTheDocument();
    expect(screen.getByText(/Utilisé : 1/)).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: 'Limite Membres' });
    expect(slider).toHaveAttribute('aria-valuenow', '2');

    await user.type(
      screen.getByLabelText('Nom de la dérogation'),
      'Découverte équipe',
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
      groupName: 'Découverte équipe',
      relatedLimits: [
        { metricKey: 'members', limitValue: 2 },
      ],
    });
  });

  it('conserve la limite effective lorsqu’une place reste disponible', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        entitlementContext={entitlementContextWithCapacity}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        workspaceId="workspace-id"
      />,
    );

    expect(screen.getByText(/Plan : 5 · Effectif : 5 · Utilisé : 4/)).toBeInTheDocument();
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

  it('force une nouvelle limite lorsqu’un quota supérieur est déjà saturé', () => {
    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        entitlementContext={entitlementContextWithSaturatedCapacity}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        workspaceId="workspace-id"
      />,
    );

    expect(screen.getByText('Ajustement requis')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Limite Membres' }))
      .toHaveAttribute('aria-valuenow', '6');
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
