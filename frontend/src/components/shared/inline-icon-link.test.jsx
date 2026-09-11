import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InlineIconLink } from '@/components/shared/inline-icon-link';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('InlineIconLink', () => {
  it('reste compact, accessible et expose son libellé dans un tooltip', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <TooltipProvider>
        <InlineIconLink
          label="Voir le workspace"
          onClick={onClick}
        />
      </TooltipProvider>,
    );

    const control = screen.getByRole('button', { name: 'Voir le workspace' });
    expect(control).toHaveClass('size-6');
    expect(screen.queryByText('Voir le workspace', { selector: '[data-base-ui-focusable]' })).not.toBeInTheDocument();

    await user.hover(control);

    expect(
      await screen.findByText('Voir le workspace', { selector: '[data-base-ui-focusable]' }),
    ).toBeInTheDocument();

    await user.click(control);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
