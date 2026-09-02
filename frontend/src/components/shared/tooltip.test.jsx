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

  it('affiche le libellé au survol puis le masque après activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<TooltipFixture onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Action' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    await user.hover(button);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('reste disponible au focus clavier sans dépendre du survol', async () => {
    const user = userEvent.setup();

    render(<TooltipFixture />);

    const tooltip = screen.getByRole('tooltip', { hidden: true });

    await user.tab();
    expect(screen.getByRole('button', { name: 'Action' })).toHaveFocus();
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
  });
});
