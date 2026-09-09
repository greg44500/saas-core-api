import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('reste décoratif et respecte reduced motion', () => {
    const { container } = render(<Skeleton className="h-6 w-24" />);
    const skeleton = container.firstChild;

    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
    expect(skeleton).toHaveClass('h-6', 'w-24');
  });
});
