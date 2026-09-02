import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlanCard } from '@/features/plan/components/plan-card';


describe('PlanCard', () => {
  it('affiche en français les conditions de trial exposées par le catalogue', () => {
    render(
      <PlanCard
        plan={{
          id: 'premium',
          key: 'premium',
          name: 'Premium',
          currency: 'EUR',
          priceMonthlyExclTaxMinor: 7900,
          priceYearlyExclTaxMinor: 79000,
          trialEnabled: true,
          trialDurationDays: 14,
        }}
      />,
    );

    expect(screen.getByText('Essai disponible pendant 14 jours')).toBeInTheDocument();
    expect(screen.getByText(/HT \/ mois/)).toBeInTheDocument();
    expect(screen.getByText(/HT \/ an/)).toBeInTheDocument();
  });

  it('n’invente pas de trial lorsque le plan ne le propose pas', () => {
    render(
      <PlanCard
        plan={{
          id: 'free',
          key: 'free',
          name: 'Free',
          currency: 'EUR',
          priceMonthlyExclTaxMinor: 0,
          priceYearlyExclTaxMinor: 0,
          trialEnabled: false,
          trialDurationDays: 0,
        }}
      />,
    );

    expect(screen.queryByText(/Essai disponible/)).not.toBeInTheDocument();
  });
});
