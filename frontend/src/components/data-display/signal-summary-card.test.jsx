import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SignalSummaryCard } from '@/components/data-display/signal-summary-card';

describe('SignalSummaryCard', () => {
  afterEach(() => cleanup());

  it('présente les catégories au même niveau et réserve le warning aux valeurs non nulles', () => {
    render(
      <SignalSummaryCard
        description="Signaux à vérifier"
        items={[
          { key: 'failed', label: 'Audits en échec', value: 4, tone: 'warning' },
          { key: 'past-due', label: 'Abonnements en retard', value: 0, tone: 'warning' },
        ]}
        title="Synthèse des points d’attention"
        total="4"
      />,
    );

    expect(screen.getByText('4 signaux détectés')).toBeInTheDocument();
    expect(screen.getByText('Audits en échec')).toBeInTheDocument();
    expect(screen.getByText('Abonnements en retard')).toBeInTheDocument();

    const values = screen.getAllByRole('definition');
    expect(values[0]).toHaveClass('text-warning');
    expect(values[1]).toHaveClass('text-muted-foreground');
  });
});
