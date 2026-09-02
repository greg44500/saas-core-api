import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataPagination } from '@/components/data-display/data-pagination';

describe('DataPagination', () => {
  it('ne rend rien lorsqu’une seule page est disponible', () => {
    const { container } = render(
      <DataPagination
        onPageChange={vi.fn()}
        page={1}
        pagination={{ page: 1, totalPages: 1 }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('centralise les bornes et la navigation précédente/suivante', () => {
    const onPageChange = vi.fn();

    render(
      <DataPagination
        onPageChange={onPageChange}
        page={2}
        pagination={{ page: 2, totalPages: 4 }}
      />,
    );

    expect(screen.getByText('Page 2 sur 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('accepte un résumé métier sans dupliquer les contrôles', () => {
    render(
      <DataPagination
        onPageChange={vi.fn()}
        page={1}
        pagination={{ page: 1, totalPages: 3 }}
        summary={<span>12 événements audités</span>}
      />,
    );

    expect(screen.getByText('12 événements audités')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
  });

  it('accepte des libellés contextualisés et un verrouillage pendant le chargement', () => {
    render(
      <DataPagination
        disabled
        nextLabel="Membres suivants"
        onPageChange={vi.fn()}
        page={2}
        pagination={{ page: 2, totalPages: 3 }}
        previousLabel="Membres précédents"
      />,
    );

    expect(screen.getByRole('button', { name: 'Membres précédents' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Membres suivants' })).toBeDisabled();
  });
});
