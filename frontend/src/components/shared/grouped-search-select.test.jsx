import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupedSearchSelect } from '@/components/shared/grouped-search-select';
import { TooltipProvider } from '@/components/ui/tooltip';

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

function renderSelect(props) {
  return render(
    <TooltipProvider>
      <GroupedSearchSelect {...props} />
    </TooltipProvider>,
  );
}

async function openSelect(user) {
  const trigger = screen.getByRole('combobox', { name: 'Fonctionnalité' });
  trigger.focus();
  await user.keyboard('{ArrowDown}');
}

describe('GroupedSearchSelect', () => {
  afterEach(() => cleanup());

  it('filtre les groupes et expose la description via le tooltip shadcn', async () => {
    const user = userEvent.setup();

    renderSelect({
      groups,
      id: 'feature',
      label: 'Fonctionnalité',
      onValueChange: vi.fn(),
      searchPlaceholder: 'Nom, domaine ou usage…',
      value: 'team_management',
    });

    await user.type(screen.getByLabelText('Rechercher fonctionnalité'), 'fichier');
    await openSelect(user);

    expect(screen.queryByRole('option', { name: /Gestion d’équipe/ })).not.toBeInTheDocument();
    const option = await screen.findByRole('option', { name: /Téléversement/ });
    await user.hover(within(option).getByText('Téléversement'));

    expect(await screen.findByText('Permet de téléverser des fichiers.')).toBeInTheDocument();
  });

  it('retourne la valeur sélectionnée sans dépendre du domaine métier', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderSelect({
      groups,
      id: 'feature',
      label: 'Fonctionnalité',
      onValueChange,
      value: 'team_management',
    });

    await openSelect(user);
    await user.click(await screen.findByRole('option', { name: /Téléversement/ }));

    expect(onValueChange).toHaveBeenCalledWith('file_upload');
  });
});
