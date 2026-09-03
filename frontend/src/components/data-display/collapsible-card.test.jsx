import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';

describe('CollapsibleCard', () => {
  afterEach(() => cleanup());

  it('garde le résumé visible et ne révèle le détail qu’à la demande', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleCard
        summary={<p>Résumé visible</p>}
        title="Usage de la plateforme"
      >
        <p>Détail secondaire</p>
      </CollapsibleCard>,
    );

    expect(screen.getByText('Résumé visible')).toBeInTheDocument();
    expect(screen.queryByText('Détail secondaire')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Afficher le détail' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(screen.getByText('Détail secondaire')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Masquer le détail' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
