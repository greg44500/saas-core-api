import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/data-display/status-badge';

describe('StatusBadge', () => {
  afterEach(() => cleanup());

  it.each([
    ['success', 'Réussie', 'text-foreground', 'bg-success/20'],
    ['destructive', 'Échouée', 'text-foreground', 'bg-destructive/20'],
    ['warning', 'À vérifier', 'text-foreground', 'bg-warning/20'],
    ['info', 'Information', 'text-foreground', 'bg-info/20'],
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
