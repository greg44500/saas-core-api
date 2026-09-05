import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EffectivePlanCapabilities } from '@/features/subscription/components/effective-plan-capabilities';


describe('EffectivePlanCapabilities', () => {
  afterEach(() => {
    cleanup();
  });

  it('affiche uniquement les capabilities effectives fournies par le backend', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: [
            'file_upload',
            'team_management',
          ],
          limits: {
            members: 12,
            storage_bytes: null,
          },
        }}
      />,
    );

    expect(screen.getByText('Droits effectifs')).toBeInTheDocument();
    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Gestion d’équipe')).toBeInTheDocument();
    expect(screen.queryByText('Journal d’activité')).not.toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Illimité')).toBeInTheDocument();
  });

  it('présente les limites fichiers comme non applicables sans file_upload', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: ['team_management'],
          limits: {
            members: 5,
            storage_bytes: 104857600,
            file_uploads_monthly: 10,
          },
        }}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('100 Mo')).not.toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('reste stable lorsque le backend ne fournit aucune capability', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: [],
          limits: {},
        }}
      />,
    );

    expect(
      screen.getByText('Aucune fonctionnalité spécifique n’est actuellement disponible.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aucune limite chiffrée n’est actuellement déclarée.'),
    ).toBeInTheDocument();
  });
});
