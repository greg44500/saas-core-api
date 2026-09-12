const RETENTION_EXECUTION_STATUS_LABELS = Object.freeze({
  running: 'En cours',
  succeeded: 'Réussie',
  failed: 'Échouée',
});

const RETENTION_EXECUTION_TRIGGER_LABELS = Object.freeze({
  manual: 'Manuelle',
  scheduled: 'Planifiée',
});

function hasPlatformPermission(platformAccess, permission) {
  return platformAccess?.status === 'active'
    && Array.isArray(platformAccess.permissions)
    && platformAccess.permissions.includes(permission);
}

function formatRetentionDate(value) {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function getRetentionExecutionStatusLabel(status) {
  return RETENTION_EXECUTION_STATUS_LABELS[status] ?? status ?? '—';
}

function getRetentionExecutionTriggerLabel(trigger) {
  return RETENTION_EXECUTION_TRIGGER_LABELS[trigger] ?? trigger ?? '—';
}

/**
 * Explique l'état du déclenchement manuel sans dupliquer les garde-fous dans
 * plusieurs composants. Le backend reste l'autorité finale au moment de
 * l'exécution ; cette fonction ne sert qu'à rendre l'UX explicite.
 */
function getRetentionManualExecutionAvailability({
  canExecute,
  policy,
  preview,
  runtime,
}) {
  if (!policy) {
    return {
      allowed: false,
      reason: 'Enregistrez d’abord une politique de rétention.',
    };
  }

  if (policy.config?.enabled !== true) {
    return {
      allowed: false,
      reason: 'La politique de rétention doit être active.',
    };
  }

  if (policy.config?.manualExecutionEnabled !== true) {
    return {
      allowed: false,
      reason: 'L’exécution manuelle doit être autorisée dans la politique de rétention.',
    };
  }

  if (!canExecute) {
    return {
      allowed: false,
      reason: 'Votre rôle ne dispose pas du droit de lancer une purge manuelle.',
    };
  }

  if (runtime?.locked === true) {
    return {
      allowed: false,
      reason: 'Une autre purge est déjà en cours.',
    };
  }

  if (!preview) {
    return {
      allowed: false,
      reason: 'Prévisualisez la purge avant de pouvoir la confirmer.',
    };
  }

  return {
    allowed: true,
    reason: 'La purge manuelle est disponible. Une confirmation sera demandée avant la suppression définitive.',
  };
}

function createRetentionPolicyFormState(policy) {
  const config = policy?.config ?? null;

  return {
    enabled: config?.enabled === true,
    retentionDays: config?.retentionDays == null ? '' : String(config.retentionDays),
    batchSize: config?.batchSize == null ? '' : String(config.batchSize),
    maxBatchesPerRun: config?.maxBatchesPerRun == null
      ? ''
      : String(config.maxBatchesPerRun),
    scheduleEnabled: config?.schedule != null,
    scheduleIntervalMinutes: config?.schedule?.intervalMinutes == null
      ? ''
      : String(config.schedule.intervalMinutes),
    manualExecutionEnabled: config?.manualExecutionEnabled === true,
  };
}

function parseBoundedInteger(value, bounds, label) {
  if (!/^\d+$/.test(String(value))) {
    return { error: `${label} doit être un entier.`, value: null };
  }

  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    return { error: `${label} est invalide.`, value: null };
  }

  if (number < bounds.min || number > bounds.max) {
    return {
      error: `${label} doit être compris entre ${bounds.min} et ${bounds.max}.`,
      value: null,
    };
  }

  return { error: null, value: number };
}

function buildRetentionPolicyPayload({ form, target, currentPolicy }) {
  if (!target?.bounds) {
    return {
      errors: { form: 'Les bornes de la cible sont indisponibles.' },
      payload: null,
    };
  }

  const fields = [
    ['retentionDays', target.bounds.retentionDays, 'Durée de conservation'],
    ['batchSize', target.bounds.batchSize, 'Taille de lot'],
    ['maxBatchesPerRun', target.bounds.maxBatchesPerRun, 'Nombre maximal de lots'],
  ];
  const errors = {};
  const values = {};

  for (const [field, bounds, label] of fields) {
    const result = parseBoundedInteger(form[field], bounds, label);
    errors[field] = result.error;
    values[field] = result.value;
  }

  if (form.scheduleEnabled) {
    const result = parseBoundedInteger(
      form.scheduleIntervalMinutes,
      target.bounds.scheduleIntervalMinutes,
      'Intervalle de planification',
    );
    errors.scheduleIntervalMinutes = result.error;
    values.scheduleIntervalMinutes = result.value;
  }

  const compactErrors = Object.fromEntries(
    Object.entries(errors).filter(([, error]) => Boolean(error)),
  );

  if (Object.keys(compactErrors).length > 0) {
    return { errors: compactErrors, payload: null };
  }

  return {
    errors: {},
    payload: {
      expectedVersion: currentPolicy?.version ?? null,
      enabled: form.enabled,
      retentionDays: values.retentionDays,
      batchSize: values.batchSize,
      maxBatchesPerRun: values.maxBatchesPerRun,
      schedule: form.scheduleEnabled
        ? { intervalMinutes: values.scheduleIntervalMinutes }
        : null,
      manualExecutionEnabled: form.manualExecutionEnabled,
    },
  };
}

function buildManualRetentionExecutionPayload({ preview, confirmation }) {
  if (!preview?.confirmation) return null;

  return {
    expectedPolicyVersion: preview.confirmation.expectedPolicyVersion,
    expectedEligibleCount: preview.confirmation.expectedEligibleCount,
    expectedMaxAffectedThisRun:
      preview.confirmation.expectedMaxAffectedThisRun,
    confirmation,
  };
}

export {
  buildManualRetentionExecutionPayload,
  buildRetentionPolicyPayload,
  createRetentionPolicyFormState,
  formatRetentionDate,
  getRetentionExecutionStatusLabel,
  getRetentionExecutionTriggerLabel,
  getRetentionManualExecutionAvailability,
  hasPlatformPermission,
};
