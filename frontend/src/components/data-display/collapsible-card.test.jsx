import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';

describe('CollapsibleCard', () => {
  afterEach(() => cleanup());

  it('garde le résumé visible, rattache l’explication à une icône et révèle le détail à la demande', async () => {
    const user = userEvent.setup();

    render(
      <CollapsibleCard
        description="Consommation actuelle"
        summary={<p>Résumé visible</p>}
        title="Usage de la plateforme"
      >
        <p>Détail secondaire</p>
      </CollapsibleCard>,
    );

    expect(screen.getByText('Résumé visible')).toBeInTheDocument();
    expect(screen.queryByText('Détail secondaire')).not.toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Consommation actuelle');
    expect(
      screen.getByRole('button', { name: 'À propos de Usage de la plateforme' }),
    ).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Afficher le détail' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(screen.getByText('Détail secondaire')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Masquer le détail' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
