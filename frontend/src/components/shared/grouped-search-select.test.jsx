import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupedSearchSelect } from '@/components/shared/grouped-search-select';

const groups = [
  {
    key: 'collaboration',
    label: 'Collaboration',
    items: [
      {
        value: 'team_management',
        label: 'Gestion d’équipe',
        description: 'Permet d’administrer les membres du workspace.',
      },
    ],
  },
  {
    key: 'files',
    label: 'Fichiers',
    items: [
      {
        value: 'file_upload',
        label: 'Téléversement',
        description: 'Permet de téléverser des fichiers.',
      },
    ],
  },
];

describe('GroupedSearchSelect', () => {
  afterEach(() => cleanup());

  it('filtre les groupes et expose la description au survol via le titre', async () => {
    const user = userEvent.setup();

    render(
      <GroupedSearchSelect
        groups={groups}
        id="feature"
        label="Fonctionnalité"
        onValueChange={vi.fn()}
        searchPlaceholder="Nom, domaine ou usage…"
        value="team_management"
      />,
    );

    await user.type(screen.getByLabelText('Rechercher fonctionnalité'), 'fichier');
    await user.click(screen.getByRole('combobox', { name: 'Fonctionnalité' }));

    expect(screen.queryByRole('option', { name: /Gestion d’équipe/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Téléversement/ }))
      .toHaveAttribute('title', 'Permet de téléverser des fichiers.');
  });

  it('retourne la valeur sélectionnée sans dépendre du domaine métier', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <GroupedSearchSelect
        groups={groups}
        id="feature"
        label="Fonctionnalité"
        onValueChange={onValueChange}
        value="team_management"
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Fonctionnalité' }));
    await user.click(screen.getByRole('option', { name: /Téléversement/ }));

    expect(onValueChange).toHaveBeenCalledWith('file_upload');
  });
});
