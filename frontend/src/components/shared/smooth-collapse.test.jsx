import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SmoothCollapse } from '@/components/shared/smooth-collapse';

describe('SmoothCollapse', () => {
  it('reste monté et passe de fermé à ouvert avec les classes de transition', () => {
    const { rerender } = render(
      <SmoothCollapse open={false}>
        <span>Contenu avancé</span>
      </SmoothCollapse>,
    );

    const content = screen.getByText('Contenu avancé');
    const container = content.parentElement?.parentElement;

    expect(content).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveClass('grid-rows-[0fr]', 'opacity-0');

    rerender(
      <SmoothCollapse open>
        <span>Contenu avancé</span>
      </SmoothCollapse>,
    );

    expect(container).toHaveAttribute('aria-hidden', 'false');
    expect(container).toHaveClass('grid-rows-[1fr]', 'opacity-100');
  });
});
