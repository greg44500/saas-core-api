import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PlatformOverviewSkeleton,
  PlatformRetentionSkeleton,
  PlatformShellSkeleton,
  PlatformTablePageSkeleton,
} from '@/features/platform/components/platform-loading-skeletons';

describe('platform loading skeletons', () => {
  it('annonce le chargement du contexte Plateforme sans exposer de données métier', () => {
    render(<PlatformShellSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement de la Plateforme…',
    );
  });

  it('annonce le chargement initial de la vue d’ensemble', () => {
    render(<PlatformOverviewSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement de la vue d’ensemble…',
    );
  });

  it('réutilise le DataTableSkeleton pour les pages tabulaires', () => {
    render(
      <PlatformTablePageSkeleton
        columns={6}
        showAction
        showFilters
      />,
    );

    expect(screen.getByText('Chargement du tableau…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('représente la géométrie spécifique de la rétention avec son historique tabulaire', () => {
    render(<PlatformRetentionSkeleton />);

    expect(screen.getByText('Chargement du tableau…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
