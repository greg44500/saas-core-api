import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InlineIconLink } from '@/components/shared/inline-icon-link';

describe('InlineIconLink', () => {
  it('reste compact, accessible et expose son libellé dans un tooltip', () => {
    const onClick = vi.fn();

    render(
      <InlineIconLink
        label="Voir le workspace"
        onClick={onClick}
      />,
    );

    const control = screen.getByRole('button', { name: 'Voir le workspace' });
    expect(control).toHaveClass('size-6');

    fireEvent.pointerEnter(control);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Voir le workspace');

    fireEvent.click(control);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
