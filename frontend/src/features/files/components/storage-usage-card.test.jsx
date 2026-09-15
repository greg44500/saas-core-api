import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  StorageUsageCard,
  resolveStoragePresentation,
} from '@/features/files/components/storage-usage-card';

const MEBIBYTE = 1024 * 1024;

describe('StorageUsageCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('affiche capacité, restant et compteurs dans une seule carte', () => {
    render(
      <StorageUsageCard
        activeCount={14}
        deletedCount={3}
        storage={{
          usedBytes: 68 * MEBIBYTE,
          limitBytes: 100 * MEBIBYTE,
          remainingBytes: 32 * MEBIBYTE,
          unlimited: false,
          overLimit: false,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Stockage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À propos du stockage' })).toBeInTheDocument();
    expect(screen.queryByText('Capacité réellement consommée par les fichiers du workspace.'))
      .not.toBeInTheDocument();
    expect(screen.getByText(/68 Mo/)).toBeInTheDocument();
    expect(screen.getByText(/sur 100 Mo/)).toBeInTheDocument();
    expect(screen.getByText('32 Mo disponibles')).toBeInTheDocument();
    expect(screen.getByText('14 fichiers actifs')).toBeInTheDocument();
    expect(screen.getByText('3 fichiers dans la corbeille')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '68');
    expect(screen.getByText('Capacité disponible')).toBeInTheDocument();
  });

  it('exprime le niveau de risque autrement que par la couleur', () => {
    const presentation = resolveStoragePresentation({
      usedBytes: 90,
      limitBytes: 100,
      remainingBytes: 10,
      unlimited: false,
      overLimit: false,
    });

    expect(presentation.label).toBe('Stockage bientôt saturé');
    expect(presentation.indicatorClassName).toBe('bg-warning');
  });

  it('ne révèle pas la corbeille lorsque son compteur n’est pas autorisé', () => {
    render(
      <StorageUsageCard
        activeCount={4}
        deletedCount={null}
        storage={{
          usedBytes: 10 * MEBIBYTE,
          limitBytes: 100 * MEBIBYTE,
          remainingBytes: 90 * MEBIBYTE,
          unlimited: false,
          overLimit: false,
        }}
      />,
    );

    expect(screen.getByText('4 fichiers actifs')).toBeInTheDocument();
    expect(screen.queryByText(/dans la corbeille/)).not.toBeInTheDocument();
    expect(screen.queryByText(/continuent d’occuper leur espace/)).not.toBeInTheDocument();
  });

  it('gère explicitement un stockage illimité', () => {
    render(
      <StorageUsageCard
        activeCount={2}
        storage={{
          usedBytes: 12 * MEBIBYTE,
          limitBytes: null,
          remainingBytes: null,
          unlimited: true,
          overLimit: false,
        }}
      />,
    );

    expect(screen.getByText('Stockage illimité')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
