import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/data-display/status-badge';

describe('StatusBadge', () => {
  afterEach(() => cleanup());

  it.each([
    ['success', 'Réussie', 'text-success', 'bg-success/15'],
    ['destructive', 'Échouée', 'text-destructive', 'bg-destructive/15'],
    ['warning', 'À vérifier', 'text-warning', 'bg-warning/15'],
    ['neutral', 'Archivée', 'text-muted-foreground', 'bg-muted'],
  ])(
    'centralise le ton %s sans imposer le libellé métier',
    (tone, label, textClass, backgroundClass) => {
      render(<StatusBadge tone={tone}>{label}</StatusBadge>);

      const badge = screen.getByText(label);
      expect(badge).toHaveClass(textClass);
      expect(badge).toHaveClass(backgroundClass);
    },
  );

  it('retombe sur le ton neutre pour un ton inconnu', () => {
    render(<StatusBadge tone="unknown">Inconnu</StatusBadge>);

    const badge = screen.getByText('Inconnu');
    expect(badge).toHaveClass('text-muted-foreground');
    expect(badge).toHaveClass('bg-muted');
  });
});
