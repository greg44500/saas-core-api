import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import App from '@/App';

describe('App', () => {
  it('rend le socle frontend et répond à une interaction utilisateur', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Frontend Core V1' }),
    ).toBeInTheDocument();

    const verificationButton = screen.getByRole('button', {
      name: 'Vérifier l’interaction (0)',
    });

    await user.click(verificationButton);

    expect(
      screen.getByRole('button', { name: 'Vérifier l’interaction (1)' }),
    ).toBeInTheDocument();
  });
});
