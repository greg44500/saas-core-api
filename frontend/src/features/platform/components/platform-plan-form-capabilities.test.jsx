import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformPlanForm } from '@/features/platform/components/platform-plan-form';


describe('PlatformPlanForm dynamic capabilities', () => {
  it('affiche une feature métier par section et permet de l’assigner au plan', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={{
          features: ['price_history'],
          featureDefinitions: [
            {
              key: 'price_history',
              label: 'Historique des prix',
              description: 'Consulter les évolutions de prix.',
              category: 'products',
              categoryLabel: 'Produits',
              displayOrder: 10,
              tags: ['reporting'],
            },
          ],
          metrics: [],
        }}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Produits')).toBeInTheDocument();
    expect(screen.getByText('Consulter les évolutions de prix.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Clé technique'), 'premium');
    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(screen.getByLabelText('Historique des prix'));
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        features: ['price_history'],
        limits: {},
      }),
    );
  });
});
