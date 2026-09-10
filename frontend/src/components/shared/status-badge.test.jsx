import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/shared/status-badge';

describe('StatusBadge', () => {
  it.each([
    ['success', 'text-success'],
    ['warning', 'text-warning'],
    ['destructive', 'text-destructive'],
    ['neutral', 'text-muted-foreground'],
  ])('applique le ton sémantique %s', (tone, expectedClass) => {
    render(<StatusBadge tone={tone}>Statut</StatusBadge>);

    expect(screen.getByText('Statut')).toHaveClass(expectedClass);
  });

  it('reste neutre si le domaine transmet un ton inconnu', () => {
    render(<StatusBadge tone="unknown">Inconnu</StatusBadge>);

    expect(screen.getByText('Inconnu')).toHaveClass('text-muted-foreground');
  });
});
