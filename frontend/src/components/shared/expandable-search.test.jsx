import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExpandableSearch } from '@/components/shared/expandable-search';

describe('ExpandableSearch', () => {
  it('déploie le champ au clic sur la loupe et lui donne le focus', async () => {
    const user = userEvent.setup();

    render(<ExpandableSearch />);

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ouvrir la recherche' }));

    const searchbox = screen.getByRole('searchbox', { name: 'Recherche globale' });
    expect(searchbox).toBeInTheDocument();
    expect(searchbox).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Lancer la recherche' }))
      .toHaveAttribute('aria-expanded', 'true');
  });

  it('transmet une requête normalisée sans connaître la source métier', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<ExpandableSearch onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: 'Ouvrir la recherche' }));
    await user.type(screen.getByRole('searchbox'), '  dossier client  ');
    await user.click(screen.getByRole('button', { name: 'Lancer la recherche' }));

    expect(onSearch).toHaveBeenCalledWith('dossier client');
  });

  it('se replie avec Échap sans dépendre d’un moteur de recherche', async () => {
    const user = userEvent.setup();

    render(<ExpandableSearch />);

    await user.click(screen.getByRole('button', { name: 'Ouvrir la recherche' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir la recherche' }))
      .toHaveAttribute('aria-expanded', 'false');
  });
});
