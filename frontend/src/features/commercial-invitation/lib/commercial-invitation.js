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
    return true;
  }

  return plan.priceMonthlyExclTaxMinor === 0
    && plan.priceYearlyExclTaxMinor === 0;
}

function getCommercialInvitationBillingOptions(plan) {
  if (!isEligibleCommercialInvitationPlan(plan)) {
    return [];
  }

  if (plan.trialEnabled === true) {
    return [
      { value: 'monthly', label: 'Mensuelle' },
      { value: 'yearly', label: 'Annuelle' },
    ];
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

  const candidate = hashParams.get('token')
    ?? location?.state?.commercialInvitationToken
    ?? '';

  const result = commercialInvitationTokenSchema.safeParse(candidate);
  return result.success ? result.data : null;
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
