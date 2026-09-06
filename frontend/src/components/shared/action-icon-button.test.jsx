import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionIconButton } from '@/components/shared/action-icon-button';

function TestIcon(props) {
  return <svg data-testid="test-icon" {...props} />;
}

describe('ActionIconButton', () => {
  afterEach(() => cleanup());

  it('sépare le libellé accessible du tooltip visuel', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ActionIconButton
        Icon={TestIcon}
        label="Voir les permissions de Support commercial"
        onClick={onClick}
        tooltipLabel="Voir"
      />,
    );

    const button = screen.getByRole('button', {
      name: 'Voir les permissions de Support commercial',
    });

    expect(button).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Voir');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
