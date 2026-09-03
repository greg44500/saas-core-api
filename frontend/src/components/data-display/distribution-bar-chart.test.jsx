import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DistributionBarChart,
  clampPercentage,
} from '@/components/data-display/distribution-bar-chart';

describe('DistributionBarChart', () => {
  afterEach(() => cleanup());

  it('conserve les valeurs et pourcentages lisibles en texte', () => {
    render(
      <DistributionBarChart
        aria-label="Répartition des plans"
        formatValue={(item) => `${item.value} espaces`}
        items={[
          { key: 'premium', label: 'Premium', value: 30, percentage: 60 },
          { key: 'free', label: 'Free', value: 20, percentage: 40 },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Répartition des plans' })).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('30 espaces · 60 %')).toBeInTheDocument();
    expect(screen.getByText('20 espaces · 40 %')).toBeInTheDocument();
  });

  it('borne uniquement la représentation visuelle entre 0 et 100', () => {
    expect(clampPercentage(-10)).toBe(0);
    expect(clampPercentage(45.5)).toBe(45.5);
    expect(clampPercentage(140)).toBe(100);
    expect(clampPercentage(Number.NaN)).toBe(0);
  });
});
