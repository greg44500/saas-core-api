import {
  commercialInvitationTokenSchema,
} from '@/features/commercial-invitation/validation/commercial-invitation-schemas';

let commercialInvitationTokenInMemory = null;

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

function setCommercialInvitationTokenInMemory(token) {
  const result = commercialInvitationTokenSchema.safeParse(token ?? '');

  commercialInvitationTokenInMemory = result.success
    ? result.data
    : null;

  return commercialInvitationTokenInMemory;
}

function clearCommercialInvitationTokenInMemory() {
  commercialInvitationTokenInMemory = null;
}

/**
 * Capture le token du fragment lors de l'arrivée depuis l'email puis le garde
 * uniquement dans le runtime JavaScript. Le secret n'entre ni dans Redux, ni
 * dans localStorage/sessionStorage, ni dans `history.state`.
 *
 * Après nettoyage du fragment, les écrans Login/Register retrouvent ce vault
 * en mémoire. Un rechargement complet du navigateur détruit volontairement le
 * secret : l'utilisateur doit alors rouvrir son lien d'invitation.
 */
function getCommercialInvitationTokenFromLocation() {
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash,
  );
  const tokenFromFragment = hashParams.get('token');
  const fragmentResult = commercialInvitationTokenSchema.safeParse(
    tokenFromFragment ?? '',
  );

  if (fragmentResult.success) {
    return setCommercialInvitationTokenInMemory(fragmentResult.data);
  }

  return commercialInvitationTokenInMemory;
}

/**
 * Nettoie le fragment sans remplacer l'état React Router de l'entrée courante.
 * Le token déjà capturé dans le vault runtime ne doit plus rester visible dans
 * l'URL.
 */
function clearCommercialInvitationTokenFragment() {
  if (!window.location.hash) return;

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}

function buildCommercialInvitationAuthState() {
  return {
    from: {
      pathname: '/commercial-invitations/accept',
    },
  };
}

export {
  buildCommercialInvitationAuthState,
  clearCommercialInvitationTokenFragment,
  clearCommercialInvitationTokenInMemory,
  getCommercialInvitationBillingOptions,
  getCommercialInvitationPlanLabel,
  getCommercialInvitationTokenFromLocation,
  isEligibleCommercialInvitationPlan,
  setCommercialInvitationTokenInMemory,
};
