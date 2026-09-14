import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectField } from '@/components/shared/select-field';
import { TooltipProvider } from '@/components/ui/tooltip';

const items = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif', disabled: true },
];

describe('SelectField', () => {
  it('affiche le placeholder puis transmet la valeur choisie', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SelectField
        id="status"
        items={items}
        label="Statut"
        onValueChange={onValueChange}
        placeholder="Choisir un statut"
        value=""
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Statut' });
    expect(trigger).toHaveTextContent('Choisir un statut');

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Actif' }));

    expect(onValueChange).toHaveBeenCalledWith('active');
  });

  it('propage les états disabled du champ et des items', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SelectField
        id="status"
        items={items}
        label="Statut"
        onValueChange={vi.fn()}
        value="active"
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Statut' }));
    expect(screen.getByRole('option', { name: 'Inactif' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    rerender(
      <SelectField
        disabled
        id="status"
        items={items}
        label="Statut"
        onValueChange={vi.fn()}
        value="active"
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Statut' })).toBeDisabled();
  });

  it('expose une aide pédagogique à la demande sans l’afficher sous le champ', () => {
    render(
      <TooltipProvider>
        <SelectField
          id="status"
          info="Cette valeur décrit le cycle de vie du compte."
          items={items}
          label="Statut"
          onValueChange={vi.fn()}
          value="active"
        />
      </TooltipProvider>,
    );

    expect(
      screen.getByRole('button', { name: 'À propos de Statut' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Cette valeur décrit le cycle de vie du compte.'),
    ).not.toBeInTheDocument();
  });
});
