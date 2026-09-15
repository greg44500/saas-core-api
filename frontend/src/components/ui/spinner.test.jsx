import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from '@/components/ui/spinner';

describe('Spinner', () => {
  it('reste décoratif et porte l’animation canonique', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('[data-slot="spinner"]');

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });
});
