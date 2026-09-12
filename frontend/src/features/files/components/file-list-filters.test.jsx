import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileListFilters } from '@/features/files/components/file-list-filters';

function renderFilters(overrides = {}) {
  const props = {
    category: '',
    onCategoryChange: vi.fn(),
    onClear: vi.fn(),
    onSearchChange: vi.fn(),
    search: '',
    ...overrides,
  };

  render(<FileListFilters {...props} />);
  return props;
}

describe('FileListFilters', () => {
  it('utilise le Select canonique et transmet la catégorie sélectionnée', async () => {
    const user = userEvent.setup();
    const props = renderFilters();

    const categoryTrigger = screen.getByLabelText('Filtrer par catégorie');
    expect(categoryTrigger).toHaveTextContent('Toutes les catégories');

    await user.click(categoryTrigger);
    await user.click(await screen.findByRole('option', { name: 'Document' }));

    expect(props.onCategoryChange).toHaveBeenCalledWith('document');
  });

  it('convertit le choix Toutes les catégories en filtre vide', async () => {
    const user = userEvent.setup();
    const props = renderFilters({ category: 'document' });

    await user.click(screen.getByLabelText('Filtrer par catégorie'));
    await user.click(await screen.findByRole('option', { name: 'Toutes les catégories' }));

    expect(props.onCategoryChange).toHaveBeenCalledWith('');
  });

  it('conserve la recherche et l’effacement des filtres', async () => {
    const user = userEvent.setup();
    const props = renderFilters({ search: 'contrat' });

    const searchInput = screen.getByLabelText('Rechercher un fichier');
    await user.type(searchInput, ' 2026');
    expect(props.onSearchChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }));
    expect(props.onClear).toHaveBeenCalledOnce();
  });
});
