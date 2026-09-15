import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PasswordField } from '@/components/forms/password-field';

describe('PasswordField', () => {
  it('relaie les attributs aria standards vers le contrôle', () => {
    render(
      <PasswordField
        aria-describedby="password-message"
        aria-invalid="true"
        aria-label="Mot de passe"
        id="password"
      />,
    );

    const input = screen.getByLabelText('Mot de passe');

    expect(input).toHaveAttribute('aria-describedby', 'password-message');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('bascule la visibilité sans changer la valeur saisie', async () => {
    const user = userEvent.setup();

    render(<PasswordField aria-label="Mot de passe" id="password" />);

    const input = screen.getByLabelText('Mot de passe');
    await user.type(input, 'Secret-123');

    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('Secret-123');
  });
});
