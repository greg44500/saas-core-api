import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckboxField } from '@/components/forms/checkbox-field';

describe('CheckboxField', () => {
  afterEach(() => cleanup());

  it('rend une sélection accessible avec son explication', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CheckboxField
        checked={false}
        description="Permission de lecture."
        id="permission-read"
        label="Consulter"
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Consulter' });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Permission de lecture.')).toBeInTheDocument();

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('empêche l’interaction lorsqu’une permission est non assignable', () => {
    render(
      <CheckboxField
        checked={false}
        disabled
        id="permission-reserved"
        label="Permission réservée"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Permission réservée' }),
    ).toBeDisabled();
  });
});
