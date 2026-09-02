import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EndTrialToFreeDialog } from '@/features/subscription/components/end-trial-to-free-dialog';


describe('EndTrialToFreeDialog', () => {
  it('explique l’irréversibilité et exige une confirmation explicite', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <EndTrialToFreeDialog
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open
        pending={false}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Votre éligibilité restera consommée',
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'vous ne pourrez pas démarrer un nouvel essai avec cette identité',
    );

    await user.click(
      screen.getByRole('button', { name: 'Mettre fin à l’essai et revenir à Free' }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('affiche un refus serveur dans la confirmation plutôt que dans un toast global', () => {
    render(
      <EndTrialToFreeDialog
        errorMessage="Retour Free refusé"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        pending={false}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Retour Free refusé');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
