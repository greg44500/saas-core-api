import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { MetricCard } from '@/components/data-display/metric-card';

describe('MetricCard', () => {
  afterEach(() => cleanup());

  it('affiche une métrique déjà résolue et rattache son explication à une icône info', async () => {
    const user = userEvent.setup();

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
    expect(screen.getByText('1 284')).toBeInTheDocument();
    expect(screen.getByText('+8,4 %')).toBeInTheDocument();
    expect(screen.getByText(/sur 30 jours/)).toBeInTheDocument();

    const infoButton = screen.getByRole('button', { name: 'À propos de Utilisateurs' });
    await user.hover(infoButton);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Comptes inscrits');
    expect(infoButton).toHaveAttribute('aria-describedby', tooltip.id);
  });
});
