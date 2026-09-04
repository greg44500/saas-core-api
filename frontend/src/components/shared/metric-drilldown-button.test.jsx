import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetricDrilldownButton } from '@/components/shared/metric-drilldown-button';


describe('MetricDrilldownButton', () => {
  afterEach(() => cleanup());

  it('rend un compteur non nul actionnable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <MetricDrilldownButton
        ariaLabel="Voir les dérogations actives"
        onClick={onClick}
        value="5"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Voir les dérogations actives' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('laisse un compteur sans contenu non interactif', () => {
    render(
      <MetricDrilldownButton
        ariaLabel="Voir les dérogations actives"
        disabled
        onClick={vi.fn()}
        value="0"
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voir les dérogations actives' })).not.toBeInTheDocument();
  });
});
