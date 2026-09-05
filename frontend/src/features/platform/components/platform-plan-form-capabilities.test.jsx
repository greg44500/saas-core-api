import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformPlanForm } from '@/features/platform/components/platform-plan-form';


describe('PlatformPlanForm dynamic capabilities', () => {
  it('affiche une feature métier avec switch et aide contextuelle puis permet de l’inclure', async () => {
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

    expect(
      screen.getByText('Fonctionnalités et limites incluses par défaut'),
    ).toBeInTheDocument();
    expect(screen.getByText('Produits')).toBeInTheDocument();
    expect(screen.queryByLabelText('Clé technique')).not.toBeInTheDocument();

    const infoButton = screen.getByRole('button', {
      name: 'Informations sur Historique des prix',
    });
    await user.hover(infoButton);

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Consulter les évolutions de prix.',
    );

    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(
      screen.getByRole('switch', {
        name: 'Activer Historique des prix',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        features: ['price_history'],
        limits: {},
      }),
    );
  });

  it('regroupe une fonctionnalité et ses quotas de présentation dans la même catégorie', () => {
    render(
      <PlatformPlanForm
        capabilities={{
          features: ['file_upload'],
          featureDefinitions: [
            {
              key: 'file_upload',
              label: 'Téléversement de fichiers',
              category: 'files',
              categoryLabel: 'Fichiers',
              displayOrder: 10,
            },
          ],
          metrics: [
            {
              key: 'storage_bytes',
              presentation: {
                label: 'Stockage',
                category: 'files',
                categoryLabel: 'Fichiers',
                unit: 'bytes',
              },
            },
            {
              key: 'file_uploads_monthly',
              presentation: {
                label: 'Téléversements mensuels',
                category: 'files',
                categoryLabel: 'Fichiers',
                unit: 'count',
              },
            },
          ],
        }}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const filesGroup = screen.getByRole('group', { name: 'Fichiers' });

    expect(
      within(filesGroup).getByRole('switch', {
        name: 'Activer Téléversement de fichiers',
      }),
    ).toBeInTheDocument();
    expect(within(filesGroup).getByText('Limites et quotas')).toBeInTheDocument();
    expect(within(filesGroup).getByText('Stockage')).toBeInTheDocument();
    expect(
      within(filesGroup).getByText('Téléversements mensuels'),
    ).toBeInTheDocument();
  });
});
