import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';

describe('CollapsibleCard', () => {
  afterEach(() => cleanup());

  it('garde le résumé visible et anime les états ouvert/fermé sans démonter le détail', async () => {
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

    const infoButton = screen.getByRole('button', {
      name: 'À propos de Usage de la plateforme',
    });
    await user.hover(infoButton);

    expect(screen.getByRole('tooltip')).toHaveTextContent('Consommation actuelle');

    const toggle = screen.getByRole('button', { name: 'Afficher le détail' });
    const content = document.getElementById(toggle.getAttribute('aria-controls'));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveAttribute('aria-hidden', 'true');
    expect(content).toHaveAttribute('data-state', 'closed');
    expect(content).toHaveClass('grid-rows-[0fr]', 'opacity-0');
    expect(content).toHaveAttribute('inert');
    expect(screen.getByText('Détail secondaire')).toBeInTheDocument();

    await user.click(toggle);

    const closeToggle = screen.getByRole('button', { name: 'Masquer le détail' });
    expect(closeToggle).toHaveAttribute('aria-expanded', 'true');
    expect(content).toHaveAttribute('aria-hidden', 'false');
    expect(content).toHaveAttribute('data-state', 'open');
    expect(content).toHaveClass('grid-rows-[1fr]', 'opacity-100');
    expect(content).not.toHaveAttribute('inert');

    await user.click(closeToggle);

    expect(content).toHaveAttribute('data-state', 'closed');
    expect(content).toHaveClass('grid-rows-[0fr]', 'opacity-0');
  });
});
