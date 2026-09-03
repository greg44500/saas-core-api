import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ComparisonBarChart,
  resolveComparisonMax,
  toBarWidth,
} from '@/components/data-display/comparison-bar-chart';

describe('ComparisonBarChart', () => {
  afterEach(() => cleanup());

  it('affiche les deux périodes en texte sans recalcul métier', () => {
    render(
      <ComparisonBarChart
        aria-label="Croissance plateforme"
        items={[
          {
            key: 'users',
            label: 'Nouveaux utilisateurs',
            current: 10,
            previous: 5,
          },
          {
            key: 'workspaces',
            label: 'Nouveaux espaces de travail',
            current: 4,
            previous: 2,
          },
        ]}
      />,
    );

    expect(screen.getByRole('group', { name: 'Croissance plateforme' })).toBeInTheDocument();
    expect(screen.getByText('Période actuelle')).toBeInTheDocument();
    expect(screen.getByText('Période précédente')).toBeInTheDocument();
    expect(screen.getByText('Nouveaux utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('normalise uniquement la longueur des barres sur la valeur maximale', () => {
    const items = [
      { current: 10, previous: 5 },
      { current: 4, previous: 2 },
    ];

    expect(resolveComparisonMax(items)).toBe(10);
    expect(toBarWidth(5, 10)).toBe(50);
    expect(toBarWidth(0, 10)).toBe(0);
    expect(toBarWidth(4, 0)).toBe(0);
  });
});
