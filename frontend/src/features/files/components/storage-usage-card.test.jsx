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

  it('affiche uniquement la capacité, le restant et la progression', () => {
    render(
      <StorageUsageCard
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
    expect(screen.getByText(/68 Mo/)).toBeInTheDocument();
    expect(screen.getByText(/sur 100 Mo/)).toBeInTheDocument();
    expect(screen.getByText('32 Mo disponibles')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '68');
    expect(screen.getByText('Capacité disponible')).toBeInTheDocument();
    expect(screen.queryByText('14 fichiers actifs')).not.toBeInTheDocument();
    expect(screen.queryByText('3 fichiers dans la corbeille')).not.toBeInTheDocument();
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

  it('ne répète pas le message de cycle de vie sous la jauge', () => {
    render(
      <StorageUsageCard
        storage={{
          usedBytes: 10 * MEBIBYTE,
          limitBytes: 100 * MEBIBYTE,
          remainingBytes: 90 * MEBIBYTE,
          unlimited: false,
          overLimit: false,
        }}
      />,
    );

    expect(screen.getByText('90 Mo disponibles')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Les fichiers placés dans la corbeille continuent d’occuper leur espace jusqu’à leur suppression définitive.',
      ),
    ).not.toBeInTheDocument();
  });

  it('gère explicitement un stockage illimité', () => {
    render(
      <StorageUsageCard
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
