import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/data-display/status-badge';

describe('StatusBadge', () => {
  afterEach(() => cleanup());

  it('centralise le ton warning sans imposer le libellé métier', () => {
    render(<StatusBadge tone="warning">À vérifier</StatusBadge>);

    const badge = screen.getByText('À vérifier');
    expect(badge).toHaveClass('text-warning');
    expect(badge).toHaveClass('bg-warning/15');
  });
});
