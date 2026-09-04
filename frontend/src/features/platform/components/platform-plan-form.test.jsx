import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformPlanForm } from '@/features/platform/components/platform-plan-form';

const capabilities = {
  features: ['file_upload', 'team_management', 'audit_logs'],
  metrics: [
    { key: 'members', definition: {} },
    { key: 'storage_bytes', definition: {} },
    { key: 'file_uploads_monthly', definition: {} },
  ],
};

describe('PlatformPlanForm', () => {
  it('crée un payload complet avec toutes les limites explicites', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Clé technique'), 'premium');
    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(
      screen.getByRole('switch', {
        name: 'Activer Téléversement de fichiers',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith({
      key: 'premium',
      name: 'Premium',
      description: null,
      status: 'active',
      isPublic: false,
      displayOrder: 0,
      trialEnabled: false,
      trialDurationDays: null,
      currency: 'EUR',
      priceMonthlyExclTaxMinor: 0,
      priceYearlyExclTaxMinor: 0,
      features: ['file_upload'],
      limits: {
        members: 0,
        storage_bytes: 0,
        file_uploads_monthly: 0,
      },
    });
  });

  it('convertit le stockage en octets et construit un trial atomique', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Clé technique'), 'premium');
    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(screen.getByLabelText('Trial disponible'));
    await user.type(screen.getByLabelText('Durée du trial en jours'), '14');
    await user.selectOptions(screen.getByLabelText('Mode', { selector: '#platform-plan-limit-mode-storage_bytes' }), 'limited');
    await user.type(screen.getByLabelText('Valeur (Mo)'), '100');
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        trialEnabled: true,
        trialDurationDays: 14,
        limits: {
          members: 0,
          storage_bytes: 100 * 1024 * 1024,
          file_uploads_monthly: 0,
        },
      }),
    );
  });

  it('refuse une durée de trial invalide avant la mutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Clé technique'), 'premium');
    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(screen.getByLabelText('Trial disponible'));
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(screen.getByRole('alert')).toHaveTextContent('La durée du trial doit être un nombre entier de jours strictement positif.');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
