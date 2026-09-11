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

describe('Tooltip compatibility adapter', () => {
  afterEach(() => cleanup());

  it('délègue l’affichage au tooltip shadcn/Base UI au survol', async () => {
    const user = userEvent.setup();

    render(<TooltipFixture />);

    const button = screen.getByRole('button', { name: 'Action' });
    await user.hover(button);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Voir');
  });

  it('reste accessible au focus clavier et se ferme avec Escape', async () => {
    const user = userEvent.setup();

    render(<TooltipFixture />);

    await user.tab();
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Voir');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('préserve l’action du contenu déclencheur', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<TooltipFixture onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
