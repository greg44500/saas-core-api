import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PlatformOverviewSkeleton,
  PlatformShellSkeleton,
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
});
