import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformEconomicKpiCards } from '@/features/platform/components/platform-economic-kpi-cards';

describe('PlatformEconomicKpiCards', () => {
  it('présente séparément paid, free et valeur contractuelle', () => {
    render(
      <PlatformEconomicKpiCards
        kpis={{
          paidActiveSubscriptions: 4,
          freeActiveAccesses: {
            total: 7,
            viaCommercialInvitation: 2,
          },
          contractedMrrEstimate: {
            byCurrency: [
              { currency: 'EUR', amountMinor: 23700 },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText('Abonnements payants actifs')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Accès gratuits actifs')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('via invitation commerciale')).toBeInTheDocument();
    expect(screen.getByText(/237,00/)).toBeInTheDocument();
  });

  it('n’invente pas de détail invitation lorsque le backend ne le fournit pas', () => {
    render(
      <PlatformEconomicKpiCards
        kpis={{
          paidActiveSubscriptions: 0,
          freeActiveAccesses: { total: 1 },
          contractedMrrEstimate: { byCurrency: [] },
        }}
      />,
    );

    expect(screen.queryByText('via invitation commerciale')).not.toBeInTheDocument();
  });
});
