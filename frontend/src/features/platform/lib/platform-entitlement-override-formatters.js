import {
  formatPlatformPlanFeature,
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

const ENTITLEMENT_OVERRIDE_TARGET = Object.freeze({
  FEATURE: 'feature',
  LIMIT: 'limit',
});

const ENTITLEMENT_OVERRIDE_SOURCE = Object.freeze({
  PROMOTION: 'promotion',
  COMMERCIAL_GESTURE: 'commercial_gesture',
  SUPPORT: 'support',
  CONTRACT: 'contract',
  INCIDENT: 'incident',
  ADMINISTRATIVE: 'administrative',
});

const ENTITLEMENT_OVERRIDE_LIFECYCLE = Object.freeze({
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
});

const SOURCE_LABELS = Object.freeze({
  [ENTITLEMENT_OVERRIDE_SOURCE.PROMOTION]: 'Promotion',
  [ENTITLEMENT_OVERRIDE_SOURCE.COMMERCIAL_GESTURE]: 'Geste commercial',
  [ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT]: 'Support',
  [ENTITLEMENT_OVERRIDE_SOURCE.CONTRACT]: 'Contrat',
  [ENTITLEMENT_OVERRIDE_SOURCE.INCIDENT]: 'Incident',
  [ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE]: 'Administratif',
});

const LIFECYCLE_LABELS = Object.freeze({
  [ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE]: 'Active',
  [ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED]: 'Planifiée',
  [ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED]: 'Expirée',
  [ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED]: 'Révoquée',
});

function formatPlatformEntitlementOverrideDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatPlatformEntitlementOverrideSource(source) {
  return SOURCE_LABELS[source] ?? source ?? '—';
}

function formatPlatformEntitlementOverrideLifecycle(lifecycle) {
  return LIFECYCLE_LABELS[lifecycle] ?? lifecycle ?? '—';
}

function formatPlatformEntitlementOverrideTarget(targetType) {
  if (targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) return 'Fonctionnalité';
  if (targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) return 'Limite';
  return targetType ?? '—';
}

function formatPlatformEntitlementOverrideCapability(override) {
  if (override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
    return formatPlatformPlanFeature(override.featureKey);
  }

  if (override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
    return formatPlatformPlanMetric(override.metricKey);
  }

  return '—';
}

function formatPlatformEntitlementOverrideValue(override) {
  if (override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
    return override.featureEnabled ? 'Activée' : 'Désactivée';
  }

  if (override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
    return formatPlatformPlanLimit(override.metricKey, override.limitValue);
  }

  return '—';
}

function isEditablePlatformEntitlementOverride(override) {
  return Boolean(
    override
    && override.lifecycle !== ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED
    && override.lifecycle !== ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED,
  );
}

export {
  ENTITLEMENT_OVERRIDE_LIFECYCLE,
  ENTITLEMENT_OVERRIDE_SOURCE,
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideCapability,
  formatPlatformEntitlementOverrideDate,
  formatPlatformEntitlementOverrideLifecycle,
  formatPlatformEntitlementOverrideSource,
  formatPlatformEntitlementOverrideTarget,
  formatPlatformEntitlementOverrideValue,
  isEditablePlatformEntitlementOverride,
};
