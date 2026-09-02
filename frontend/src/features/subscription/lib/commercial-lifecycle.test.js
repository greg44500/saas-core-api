import { describe, expect, it } from 'vitest';

import { getDowngradeCandidates } from '@/features/subscription/lib/commercial-lifecycle';

const plans = [
  {
    id: 'free',
    key: 'free',
    name: 'Free',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 0,
    priceYearlyExclTaxMinor: 0,
  },
  {
    id: 'standard',
    key: 'standard',
    name: 'Standard',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 4900,
    priceYearlyExclTaxMinor: 49000,
  },
  {
    id: 'premium',
    key: 'premium',
    name: 'Premium',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 7900,
    priceYearlyExclTaxMinor: 79000,
  },
  {
    id: 'ai',
    key: 'ai',
    name: 'IA',
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 12900,
    priceYearlyExclTaxMinor: 129000,
  },
  {
    id: 'foreign',
    key: 'foreign',
    name: 'Dollar',
    currency: 'USD',
    priceMonthlyExclTaxMinor: 2900,
    priceYearlyExclTaxMinor: 29000,
  },
];

describe('getDowngradeCandidates', () => {
  it('propose uniquement les plans non-Free moins chers dans la même devise', () => {
    const result = getDowngradeCandidates({
      plans,
      commercial: {
        plan: { id: 'premium' },
        billingInterval: 'monthly',
      },
    });

    expect(result.map((plan) => plan.id)).toEqual(['standard']);
  });

  it('utilise le tarif annuel lorsque la souscription est annuelle', () => {
    const result = getDowngradeCandidates({
      plans,
      commercial: {
        plan: { id: 'ai' },
        billingInterval: 'yearly',
      },
    });

    expect(result.map((plan) => plan.id)).toEqual(['premium', 'standard']);
  });

  it('ne devine aucun downgrade lorsque le prix courant manque au catalogue', () => {
    expect(getDowngradeCandidates({
      plans,
      commercial: {
        plan: { id: 'unknown' },
        billingInterval: 'monthly',
      },
    })).toEqual([]);
  });
});
