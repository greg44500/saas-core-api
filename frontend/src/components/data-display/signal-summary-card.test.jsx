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

    expect(screen.getByText('signaux détectés')).toBeInTheDocument();

    const failedLabel = screen.getByText('Audits en échec');
    const pastDueLabel = screen.getByText('Abonnements en retard');

    expect(failedLabel.nextElementSibling).toHaveTextContent('4');
    expect(failedLabel.nextElementSibling).toHaveClass('text-warning');
    expect(pastDueLabel.nextElementSibling).toHaveTextContent('0');
    expect(pastDueLabel.nextElementSibling).toHaveClass('text-muted-foreground');
  });
});
