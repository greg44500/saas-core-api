import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectField } from '@/components/forms/select-field';

afterEach(() => cleanup());

describe('SelectField', () => {
  it('rend un select accessible et propage le changement de valeur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SelectField
        id="role"
        label="Nouveau rôle"
        onChange={onChange}
        options={[
          { value: 'role-a', label: 'Support technique' },
          { value: 'role-b', label: 'Support client' },
        ]}
        value=""
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Nouveau rôle' });

    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Support technique' })).toBeInTheDocument();

    await user.selectOptions(select, 'role-a');

    expect(onChange).toHaveBeenCalled();
  });
});
