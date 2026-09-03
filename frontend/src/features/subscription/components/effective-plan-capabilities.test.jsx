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
