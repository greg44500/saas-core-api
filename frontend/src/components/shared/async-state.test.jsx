import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

describe('shared async states', () => {
  it('rend un état vide sans inventer de comportement métier', () => {
    render(
      <EmptyState
        description="Aucune donnée n’est disponible."
        title="Aucun élément"
      />,
    );

    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
    expect(screen.getByText('Aucune donnée n’est disponible.')).toBeInTheDocument();
  });

  it('annonce une erreur et expose le retry uniquement lorsqu’il est possible', () => {
    const onRetry = vi.fn();

    render(
      <ErrorState
        description="La lecture a échoué."
        onRetry={onRetry}
        title="Données indisponibles"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Données indisponibles');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
