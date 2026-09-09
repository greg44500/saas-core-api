import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from '@/components/shared/tooltip';

function TooltipFixture({ onClick = vi.fn() }) {
  return (
    <Tooltip content="Voir">
      <button onClick={onClick} type="button">Action</button>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  afterEach(() => cleanup());

  it('affiche le libellé au survol, le relie au trigger puis le masque après activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<TooltipFixture onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Action' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    await user.hover(button);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(button).not.toHaveAttribute('aria-describedby');
  });

  it('reste disponible au focus clavier et peut être fermé avec Escape', async () => {
    const user = userEvent.setup();

    render(<TooltipFixture />);

    const tooltip = screen.getByRole('tooltip', { hidden: true });

    await user.tab();
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveFocus();
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    await user.keyboard('{Escape}');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(button).toHaveFocus();
  });

  it('permet au pointeur d’entrer dans le contenu affiché', async () => {
    const user = userEvent.setup();

    render(<TooltipFixture />);

    const button = screen.getByRole('button', { name: 'Action' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    await user.hover(button);
    expect(tooltip).toHaveClass('pointer-events-auto');
  });

  it('propose un positionnement latéral réutilisable sans dupliquer la mécanique', () => {
    render(
      <Tooltip content="Navigation" side="right" wrapperClassName="flex w-full">
        <button type="button">Section</button>
      </Tooltip>,
    );

    const button = screen.getByRole('button', { name: 'Section' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    expect(button.parentElement).toHaveClass('flex', 'w-full');
    expect(tooltip).toHaveClass('left-full', 'top-1/2', 'ml-3', '-translate-y-1/2');
  });
});