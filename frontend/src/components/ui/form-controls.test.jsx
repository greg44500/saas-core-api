import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

function ControlledSwitch({ onCheckedChange }) {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      aria-label="Notifications"
      checked={checked}
      onCheckedChange={(nextChecked) => {
        setChecked(nextChecked);
        onCheckedChange?.(nextChecked);
      }}
    />
  );
}

describe('form control primitives', () => {
  it('relaie les attributs natifs et le contrat visuel de Input', () => {
    render(<Input aria-invalid="true" aria-label="Nom" disabled />);

    const input = screen.getByLabelText('Nom');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('relaie les attributs natifs et le contrat visuel de Textarea', () => {
    render(<Textarea aria-invalid="true" aria-label="Description" disabled />);

    const textarea = screen.getByLabelText('Description');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute('data-slot', 'textarea');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('conserve une checkbox native compatible avec les formulaires HTML', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Checkbox
        aria-label="Conditions"
        name="legalAccepted"
        onChange={onChange}
        value="yes"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Conditions' });
    expect(checkbox).toHaveAttribute('data-slot', 'checkbox');
    expect(checkbox).toHaveAttribute('name', 'legalAccepted');
    expect(checkbox).toHaveAttribute('value', 'yes');

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('pilote le Switch Base UI avec le contrat applicatif checked/onCheckedChange', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<ControlledSwitch onCheckedChange={onCheckedChange} />);

    const control = screen.getByRole('switch', { name: 'Notifications' });
    expect(control).toHaveAttribute('data-slot', 'switch');
    expect(control).toHaveAttribute('aria-checked', 'false');

    await user.click(control);

    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('respecte disabled sur le Switch Base UI', () => {
    const onCheckedChange = vi.fn();

    render(
      <Switch
        aria-label="Notifications"
        checked={false}
        disabled
        onCheckedChange={onCheckedChange}
      />,
    );

    const control = screen.getByRole('switch', { name: 'Notifications' });
    expect(control).toBeDisabled();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
