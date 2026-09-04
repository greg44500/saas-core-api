import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { InfoTooltip } from '@/components/shared/info-tooltip';

describe('InfoTooltip', () => {
  afterEach(() => cleanup());

  it('relie l’explication au bouton utilisable au clavier', async () => {
    const user = userEvent.setup();

    render(
      <InfoTooltip
        content="Explication de la métrique"
        label="À propos de la métrique"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'À propos de la métrique' });
    await user.tab();

    const tooltip = screen.getByRole('tooltip');
    expect(document.activeElement).toBe(trigger);
    expect(tooltip).toHaveTextContent('Explication de la métrique');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('rend la bulle dans le body pour échapper aux conteneurs overflow', async () => {
    const user = userEvent.setup();

    render(
      <div data-testid="scroll-container" style={{ overflow: 'hidden' }}>
        <InfoTooltip
          content="Information non tronquée"
          label="Afficher l’information"
        />
      </div>,
    );

    await user.hover(screen.getByRole('button', { name: 'Afficher l’information' }));

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.parentElement).toBe(document.body);
    expect(tooltip).toHaveClass('fixed');
    expect(tooltip).toHaveClass('z-[110]');
  });
});
