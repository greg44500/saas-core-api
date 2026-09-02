const DAY_IN_MS = 24 * 60 * 60 * 1000;

const SUBSCRIPTION_STATUS_LABEL = Object.freeze({
  trialing: 'Période d’essai',
  active: 'Actif',
  past_due: 'Paiement en attente',
  canceled: 'Résilié',
  expired: 'Expiré',
});

const ACCESS_MODE_LABEL = Object.freeze({
  normal: 'Accès normal',
  remediation: 'Mise en conformité requise',
});

const LIMIT_LABEL = Object.freeze({
  members: 'Membres',
  storage_bytes: 'Stockage',
  file_uploads_monthly: 'Téléversements mensuels',
});

function formatSubscriptionStatus(status) {
  return SUBSCRIPTION_STATUS_LABEL[status] ?? status ?? 'Non renseigné';
}

function formatAccessMode(accessMode) {
  return ACCESS_MODE_LABEL[accessMode] ?? accessMode ?? 'Non renseigné';
}

function formatSubscriptionDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatLimitLabel(limitKey) {
  return LIMIT_LABEL[limitKey] ?? limitKey;
}

/**
 * Calcule uniquement une information de présentation du trial.
 *
 * Le résultat ne doit jamais servir à décider si le trial fournit encore des
 * droits : cette décision appartient à `effectiveEntitlement` côté backend.
 *
 * @param {{ startAt?: string | Date | null, endAt?: string | Date | null, now?: Date }} input
 * @returns {{ progressPercent: number, remainingDays: number } | null}
 */
function getTrialProgress({ startAt, endAt, now = new Date() }) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (
    Number.isNaN(start.getTime())
    || Number.isNaN(end.getTime())
    || !(now instanceof Date)
    || Number.isNaN(now.getTime())
    || end <= start
  ) {
    return null;
  }

  const duration = end.getTime() - start.getTime();
  const elapsed = Math.min(
    Math.max(now.getTime() - start.getTime(), 0),
    duration,
  );
  const remaining = Math.max(end.getTime() - now.getTime(), 0);

  return {
    progressPercent: Math.round((elapsed / duration) * 100),
    remainingDays: Math.ceil(remaining / DAY_IN_MS),
  };
}

export {
  ACCESS_MODE_LABEL,
  LIMIT_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  formatAccessMode,
  formatLimitLabel,
  formatSubscriptionDate,
  formatSubscriptionStatus,
  getTrialProgress,
};
