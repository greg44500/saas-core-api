import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  buildCommercialInvitationAuthState,
  clearCommercialInvitationTokenFragment,
  clearCommercialInvitationTokenInMemory,
  getCommercialInvitationBillingOptions,
  getCommercialInvitationTokenFromLocation,
  isEligibleCommercialInvitationPlan,
  setCommercialInvitationTokenInMemory,
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
  clearCommercialInvitationTokenInMemory();
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
    expect(isEligibleCommercialInvitationPlan({
      ...privateFreePlan,
      trialEnabled: true,
    })).toBe(false);
  });

  it('dérive uniquement les périodicités payantes du trial', () => {
    expect(getCommercialInvitationBillingOptions(privateFreePlan)).toEqual([
      {
        value: 'none',
        label: 'Sans périodicité — accès gratuit durable',
      },
    ]);

    expect(getCommercialInvitationBillingOptions({
      ...privateFreePlan,
      trialEnabled: true,
      priceMonthlyExclTaxMinor: 7900,
      priceYearlyExclTaxMinor: 79000,
    }).map(({ value }) => value)).toEqual(['monthly', 'yearly']);

    expect(getCommercialInvitationBillingOptions({
      ...privateFreePlan,
      trialEnabled: true,
      priceYearlyExclTaxMinor: 79000,
    }).map(({ value }) => value)).toEqual(['yearly']);
  });

  it('capture le token depuis le fragment puis le retire de l’URL', () => {
    window.history.replaceState({}, '', `/commercial-invitations/accept#token=${TOKEN}`);

    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);

    clearCommercialInvitationTokenFragment();

    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/commercial-invitations/accept');
    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);
  });

  it('conserve le token uniquement dans le vault runtime pendant Auth', () => {
    expect(setCommercialInvitationTokenInMemory(TOKEN)).toBe(TOKEN);
    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);

    expect(buildCommercialInvitationAuthState()).toEqual({
      from: { pathname: '/commercial-invitations/accept' },
    });
    expect(buildCommercialInvitationAuthState()).not.toHaveProperty(
      'commercialInvitationToken',
    );
  });

  it('ignore un fragment invalide si le vault runtime possède encore le token valide', () => {
    setCommercialInvitationTokenInMemory(TOKEN);
    window.history.replaceState({}, '', '/commercial-invitations/accept#token=bad-token');

    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);
  });

  it('efface explicitement le secret runtime', () => {
    setCommercialInvitationTokenInMemory(TOKEN);
    clearCommercialInvitationTokenInMemory();

    expect(getCommercialInvitationTokenFromLocation()).toBeNull();
  });

  it('refuse de placer un secret invalide dans le vault', () => {
    expect(setCommercialInvitationTokenInMemory('bad-token')).toBeNull();
    expect(getCommercialInvitationTokenFromLocation()).toBeNull();
  });
});
