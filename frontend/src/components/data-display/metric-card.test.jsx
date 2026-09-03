import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MetricCard } from '@/components/data-display/metric-card';

describe('MetricCard', () => {
  afterEach(() => cleanup());

  it('affiche une métrique déjà résolue sans logique métier locale', () => {
    render(
      <MetricCard
        description="Comptes inscrits"
        title="Utilisateurs"
        trend="+8,4 %"
        trendLabel="sur 30 jours"
        trendTone="positive"
        value="1 284"
      />,
    );

    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Comptes inscrits')).toBeInTheDocument();
    expect(screen.getByText('1 284')).toBeInTheDocument();
    expect(screen.getByText('+8,4 %')).toBeInTheDocument();
    expect(screen.getByText(/sur 30 jours/)).toBeInTheDocument();
  });
});
