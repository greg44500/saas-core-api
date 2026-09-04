import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformEntitlementOverrideForm } from '@/features/platform/components/platform-entitlement-override-form';

const capabilities = {
  features: ['file_upload'],
  featureDefinitions: [
    { key: 'file_upload', label: 'Téléversement de fichiers' },
  ],
  metrics: [
    {
      key: 'storage_bytes',
      presentation: { label: 'Stockage', unit: 'bytes' },
    },
  ],
};

const workspaces = [
  { id: 'workspace-id', name: 'Workspace Démo' },
];

describe('PlatformEntitlementOverrideForm', () => {
  afterEach(() => cleanup());

  it('propose uniquement les capabilities fournies par le registre actif', () => {
    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        workspaces={workspaces}
      />,
    );

    expect(screen.getByRole('option', { name: 'Téléversement de fichiers' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Capability inventée' })).not.toBeInTheDocument();
  });

  it('construit une création feature sans inventer de logique métier', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformEntitlementOverrideForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        workspaces={workspaces}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Espace de travail'), 'workspace-id');
    await user.type(screen.getByLabelText('Motif'), 'Geste de support validé');
    await user.click(screen.getByRole('button', { name: 'Créer la dérogation' }));

    expect(onSubmit).toHaveBeenCalledWith({
      source: 'administrative',
      reason: 'Geste de support validé',
      endsAt: null,
      workspaceId: 'workspace-id',
      targetType: 'feature',
      featureKey: 'file_upload',
      featureEnabled: true,
    });
  });
});
