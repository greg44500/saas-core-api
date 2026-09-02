const PLATFORM_PLAN_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

const PLATFORM_PLAN_STATUS_LABEL = Object.freeze({
  active: 'Actif',
  inactive: 'Inactif',
  archived: 'Archivé',
});

const PLATFORM_PLAN_FEATURE_LABEL = Object.freeze({
  file_upload: 'Téléversement de fichiers',
  team_management: 'Gestion d’équipe',
  audit_logs: 'Historique d’activité',
});

const PLATFORM_PLAN_METRIC_LABEL = Object.freeze({
  members: 'Membres',
  storage_bytes: 'Stockage',
  file_uploads_monthly: 'Téléversements mensuels',
});

function humanizeCapabilityKey(key) {
  if (!key) return '—';

  const normalized = String(key).replaceAll('_', ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatPlatformPlanStatus(status) {
  return PLATFORM_PLAN_STATUS_LABEL[status] ?? humanizeCapabilityKey(status);
}

function formatPlatformPlanFeature(feature) {
  return PLATFORM_PLAN_FEATURE_LABEL[feature] ?? humanizeCapabilityKey(feature);
}

function formatPlatformPlanMetric(metric) {
  return PLATFORM_PLAN_METRIC_LABEL[metric] ?? humanizeCapabilityKey(metric);
}

function formatPlatformPlanPrice(minorValue, currency = 'EUR') {
  if (!Number.isInteger(minorValue)) return '—';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(minorValue / 100);
}

function formatPlatformPlanDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPlatformPlanLimit(metric, value) {
  if (value === null) return 'Illimité';
  if (!Number.isInteger(value)) return 'Non configuré';
  if (value === 0) return 'Aucune consommation';

  if (metric === 'storage_bytes') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'unit',
      unit: 'megabyte',
      unitDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value / (1024 * 1024));
  }

  return new Intl.NumberFormat('fr-FR').format(value);
}

export {
  PLATFORM_PLAN_STATUS,
  PLATFORM_PLAN_STATUS_LABEL,
  formatPlatformPlanDate,
  formatPlatformPlanFeature,
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
  formatPlatformPlanPrice,
  formatPlatformPlanStatus,
};
