import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  buildCommercialInvitationAuthState,
  clearCommercialInvitationTokenFragment,
  getCommercialInvitationBillingOptions,
  getCommercialInvitationTokenFromLocation,
  isEligibleCommercialInvitationPlan,
} from '@/features/commercial-invitation/lib/commercial-invitation';

const TOKEN = 'a'.repeat(64);

const privateFreePlan = {
  id: 'plan-id',
  status: 'active',
  isPublic: false,
  isBaseline: false,
  trialEnabled: false,
  priceMonthlyExclTaxMinor: 0,
  priceYearlyExclTaxMinor: 0,
};

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('commercial invitation helpers', () => {
  it('n’autorise que les offres privées compatibles avec D-020', () => {
    expect(isEligibleCommercialInvitationPlan(privateFreePlan)).toBe(true);
    expect(isEligibleCommercialInvitationPlan({
      ...privateFreePlan,
      isPublic: true,
    })).toBe(false);
    expect(isEligibleCommercialInvitationPlan({
      ...privateFreePlan,
      trialEnabled: false,
      priceMonthlyExclTaxMinor: 7900,
    })).toBe(false);
    expect(isEligibleCommercialInvitationPlan({
      ...privateFreePlan,
      trialEnabled: true,
      priceMonthlyExclTaxMinor: 7900,
      priceYearlyExclTaxMinor: 79000,
    })).toBe(true);
  });

  it('dérive la périodicité du type d’offre au lieu de la laisser libre', () => {
    expect(getCommercialInvitationBillingOptions(privateFreePlan)).toEqual([
      {
        value: 'none',
        label: 'Sans périodicité — accès gratuit durable',
      },
    ]);

    expect(getCommercialInvitationBillingOptions({
      ...privateFreePlan,
      trialEnabled: true,
    }).map(({ value }) => value)).toEqual(['monthly', 'yearly']);
  });

  it('lit le token depuis le fragment puis permet de le retirer de l’URL', () => {
    window.history.replaceState({}, '', `/commercial-invitations/accept#token=${TOKEN}`);

    expect(getCommercialInvitationTokenFromLocation({ state: null })).toBe(TOKEN);

    clearCommercialInvitationTokenFragment();

    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/commercial-invitations/accept');
  });

  it('reprend le token depuis l’état mémoire React Router après Auth', () => {
    expect(getCommercialInvitationTokenFromLocation({
      state: { commercialInvitationToken: TOKEN },
    })).toBe(TOKEN);

    expect(buildCommercialInvitationAuthState(TOKEN)).toEqual({
      from: { pathname: '/commercial-invitations/accept' },
      commercialInvitationToken: TOKEN,
    });
  });

  it('refuse un secret de forme invalide', () => {
    expect(getCommercialInvitationTokenFromLocation({
      state: { commercialInvitationToken: 'bad-token' },
    })).toBeNull();
  });
});
