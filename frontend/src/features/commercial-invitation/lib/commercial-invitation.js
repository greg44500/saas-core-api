import {
  commercialInvitationTokenSchema,
} from '@/features/commercial-invitation/validation/commercial-invitation-schemas';

function isEligibleCommercialInvitationPlan(plan) {
  if (
    !plan
    || plan.status !== 'active'
    || plan.isPublic !== false
    || plan.isBaseline === true
  ) {
    return false;
  }

  if (plan.trialEnabled === true) {
    return plan.priceMonthlyExclTaxMinor > 0
      || plan.priceYearlyExclTaxMinor > 0;
  }

  return plan.priceMonthlyExclTaxMinor === 0
    && plan.priceYearlyExclTaxMinor === 0;
}

function getCommercialInvitationBillingOptions(plan) {
  if (!isEligibleCommercialInvitationPlan(plan)) {
    return [];
  }

  if (plan.trialEnabled === true) {
    const options = [];

    if (plan.priceMonthlyExclTaxMinor > 0) {
      options.push({ value: 'monthly', label: 'Mensuelle' });
    }

    if (plan.priceYearlyExclTaxMinor > 0) {
      options.push({ value: 'yearly', label: 'Annuelle' });
    }

    return options;
  }

  return [
    { value: 'none', label: 'Sans périodicité — accès gratuit durable' },
  ];
}

function getCommercialInvitationPlanLabel(plan) {
  if (!plan) return '';

  if (plan.trialEnabled) {
    return `${plan.name} — trial ${plan.trialDurationDays ?? '?'} jour(s)`;
  }

  return `${plan.name} — accès privé gratuit`;
}

function getCommercialInvitationTokenFromLocation(location) {
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash,
  );

  const candidates = [
    hashParams.get('token'),
    location?.state?.commercialInvitationToken,
  ];

  for (const candidate of candidates) {
    const result = commercialInvitationTokenSchema.safeParse(candidate ?? '');
    if (result.success) return result.data;
  }

  return null;
}

/**
 * Nettoie le fragment sans remplacer l'état React Router de l'entrée courante.
 * Le token déjà copié en mémoire ne doit plus rester visible dans l'URL.
 */
function clearCommercialInvitationTokenFragment() {
  if (!window.location.hash) return;

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}

function buildCommercialInvitationAuthState(token) {
  return {
    from: {
      pathname: '/commercial-invitations/accept',
    },
    commercialInvitationToken: token,
  };
}

export {
  buildCommercialInvitationAuthState,
  clearCommercialInvitationTokenFragment,
  getCommercialInvitationBillingOptions,
  getCommercialInvitationPlanLabel,
  getCommercialInvitationTokenFromLocation,
  isEligibleCommercialInvitationPlan,
};
