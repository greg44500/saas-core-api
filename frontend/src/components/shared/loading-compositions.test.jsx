import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EntityDetailsSkeleton } from '@/components/shared/entity-details-skeleton';
import { FormSectionSkeleton } from '@/components/shared/form-section-skeleton';

describe('shared loading compositions', () => {
  it('annonce un chargement de détail sans exposer de fausse donnée métier', () => {
    render(
      <EntityDetailsSkeleton
        label="Chargement du détail test…"
        rowsPerSection={[2, 3]}
        sections={2}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement du détail test…',
    );
  });

  it('annonce le chargement d’une section de formulaire sensible', () => {
    render(
      <FormSectionSkeleton
        fields={3}
        label="Chargement des paramètres test…"
        variant="sensitive"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement des paramètres test…',
    );
  });
});
