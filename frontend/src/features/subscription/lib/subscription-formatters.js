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

const ACCESS_REASON_LABEL = Object.freeze({
  plan_limits_exceeded: 'La consommation actuelle dépasse une ou plusieurs limites du plan effectif.',
});

const FEATURE_LABEL = Object.freeze({
  file_upload: 'Téléversement de fichiers',
  team_management: 'Gestion d’équipe',
  audit_logs: 'Journal d’activité',
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

function formatAccessReason(reason) {
  return ACCESS_REASON_LABEL[reason] ?? 'Le workspace doit être remis en conformité avec les limites du plan effectif.';
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

function formatFeatureLabel(featureKey) {
  return FEATURE_LABEL[featureKey] ?? featureKey;
}

/**
 * Accepte la clé seule ou l'objet détaillé renvoyé par le backend lors d'une
 * incompatibilité de plan. Cette tolérance évite de coupler le rendu à une
 * représentation simplifiée qui ferait perdre `usage`, `limit` et `excess`.
 */
function formatLimitLabel(limit) {
  const limitKey = typeof limit === 'string' ? limit : limit?.key;
  return LIMIT_LABEL[limitKey] ?? limitKey ?? 'Limite inconnue';
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value < 1024) return `${value} o`;

  const units = ['Ko', 'Mo', 'Go', 'To'];
  let amount = value / 1024;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(amount)} ${units[unitIndex]}`;
}

/**
 * Formate une valeur de limite sans en déduire une règle métier. `null` reste
 * affiché comme illimité, conformément au contrat Plan qui utilise cette
 * valeur pour l'absence de plafond fini.
 */
function formatPlanLimitValue(limitKey, value) {
  if (value === null) return 'Illimité';
  if (limitKey === 'storage_bytes') return formatBytes(Number(value));
  if (Number.isFinite(Number(value))) return new Intl.NumberFormat('fr-FR').format(Number(value));
  return '—';
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
  ACCESS_REASON_LABEL,
  FEATURE_LABEL,
  LIMIT_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  formatAccessMode,
  formatAccessReason,
  formatFeatureLabel,
  formatLimitLabel,
  formatPlanLimitValue,
  formatSubscriptionDate,
  formatSubscriptionStatus,
  getTrialProgress,
};
