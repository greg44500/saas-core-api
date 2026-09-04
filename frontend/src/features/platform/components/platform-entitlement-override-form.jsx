import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ENTITLEMENT_OVERRIDE_SOURCE,
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideSource,
} from '@/features/platform/lib/platform-entitlement-override-formatters';
import {
  formatPlatformPlanFeature,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('La date renseignée est invalide.');
  }
  return date.toISOString();
}

function isByteMetric(metric) {
  return metric?.presentation?.unit === 'bytes'
    || metric?.unit === 'bytes'
    || metric?.key === 'storage_bytes';
}

function getFeatureLabel(featureKey, definitionsByKey) {
  return definitionsByKey.get(featureKey)?.label
    ?? formatPlatformPlanFeature(featureKey);
}

function PlatformEntitlementOverrideForm({
  capabilities,
  mode,
  onCancel,
  onSubmit,
  override = null,
  pending = false,
  submitError = null,
  workspaces = [],
}) {
  const featureDefinitionsByKey = useMemo(
    () => new Map(
      (capabilities?.featureDefinitions ?? []).map((definition) => [definition.key, definition]),
    ),
    [capabilities],
  );
  const metrics = capabilities?.metrics ?? [];
  const metricsByKey = useMemo(
    () => new Map(metrics.map((metric) => [metric.key, metric])),
    [metrics],
  );

  const [formError, setFormError] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(override?.workspace?.id ?? '');
  const [targetType, setTargetType] = useState(
    override?.targetType ?? ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
  );
  const [featureKey, setFeatureKey] = useState(
    override?.featureKey ?? capabilities?.features?.[0] ?? '',
  );
  const [metricKey, setMetricKey] = useState(
    override?.metricKey ?? metrics?.[0]?.key ?? '',
  );
  const [featureEnabled, setFeatureEnabled] = useState(
    override?.featureEnabled ?? true,
  );
  const [limitMode, setLimitMode] = useState(
    override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT && override?.limitValue === null
      ? 'unlimited'
      : 'limited',
  );
  const [limitValue, setLimitValue] = useState(() => {
    if (
      override?.targetType !== ENTITLEMENT_OVERRIDE_TARGET.LIMIT
      || override?.limitValue == null
    ) {
      return '';
    }

    const metric = metricsByKey.get(override.metricKey);
    return isByteMetric(metric)
      ? String(override.limitValue / (1024 * 1024))
      : String(override.limitValue);
  });
  const [source, setSource] = useState(
    override?.source ?? ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
  );
  const [startsAt, setStartsAt] = useState(toLocalDateTimeInput(override?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(override?.endsAt));
  const [reason, setReason] = useState(override?.reason ?? '');

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    try {
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 3 || normalizedReason.length > 500) {
        throw new Error('Le motif doit contenir entre 3 et 500 caractères.');
      }

      const normalizedStartsAt = toIsoDateTime(startsAt);
      const normalizedEndsAt = endsAt ? toIsoDateTime(endsAt) : null;
      if (
        normalizedStartsAt
        && normalizedEndsAt
        && new Date(normalizedEndsAt) <= new Date(normalizedStartsAt)
      ) {
        throw new Error('La fin de la dérogation doit être postérieure à son début.');
      }

      const payload = {
        source,
        reason: normalizedReason,
        ...(normalizedStartsAt ? { startsAt: normalizedStartsAt } : {}),
        endsAt: normalizedEndsAt,
      };

      if (mode === 'create') {
        if (!workspaceId) {
          throw new Error('Sélectionnez un espace de travail.');
        }

        payload.workspaceId = workspaceId;
        payload.targetType = targetType;
      }

      const effectiveTargetType = mode === 'edit' ? override?.targetType : targetType;

      if (effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        if (mode === 'create') {
          if (!featureKey) throw new Error('Sélectionnez une fonctionnalité.');
          payload.featureKey = featureKey;
        }
        payload.featureEnabled = featureEnabled;
      } else {
        if (mode === 'create') {
          if (!metricKey) throw new Error('Sélectionnez une métrique.');
          payload.metricKey = metricKey;
        }

        if (limitMode === 'unlimited') {
          payload.limitValue = null;
        } else {
          const effectiveMetricKey = mode === 'edit' ? override?.metricKey : metricKey;
          const metric = metricsByKey.get(effectiveMetricKey);
          const normalizedValue = String(limitValue).replace(',', '.').trim();
          const numericValue = Number(normalizedValue);

          if (!normalizedValue || !Number.isFinite(numericValue) || numericValue < 0) {
            throw new Error('La limite doit être un nombre positif ou nul.');
          }

          if (isByteMetric(metric)) {
            payload.limitValue = Math.round(numericValue * 1024 * 1024);
          } else {
            if (!Number.isInteger(numericValue)) {
              throw new Error('La limite doit être un entier.');
            }
            payload.limitValue = numericValue;
          }
        }
      }

      await onSubmit(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Le formulaire est invalide.');
    }
  }

  const effectiveTargetType = mode === 'edit' ? override?.targetType : targetType;
  const effectiveMetricKey = mode === 'edit' ? override?.metricKey : metricKey;
  const effectiveMetric = metricsByKey.get(effectiveMetricKey);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {mode === 'create' ? (
        <section className="space-y-4">
          <h3 className="font-semibold">Cible de la dérogation</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-workspace">Espace de travail</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-workspace"
              onChange={(event) => setWorkspaceId(event.target.value)}
              value={workspaceId}
            >
              <option value="">Sélectionner…</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name ?? workspace.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-target-type">Type</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-target-type"
              onChange={(event) => setTargetType(event.target.value)}
              value={targetType}
            >
              <option value={ENTITLEMENT_OVERRIDE_TARGET.FEATURE}>Fonctionnalité</option>
              <option value={ENTITLEMENT_OVERRIDE_TARGET.LIMIT}>Limite</option>
            </select>
          </div>

          {targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="override-feature">Fonctionnalité</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="override-feature"
                onChange={(event) => setFeatureKey(event.target.value)}
                value={featureKey}
              >
                {(capabilities?.features ?? []).map((key) => (
                  <option key={key} value={key}>
                    {getFeatureLabel(key, featureDefinitionsByKey)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="override-metric">Métrique</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="override-metric"
                onChange={(event) => setMetricKey(event.target.value)}
                value={metricKey}
              >
                {metrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.presentation?.label ?? formatPlatformPlanMetric(metric.key)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p><span className="font-medium">Workspace :</span> {override?.workspace?.name ?? '—'}</p>
          <p className="mt-1">
            <span className="font-medium">Cible :</span>{' '}
            {override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
              ? getFeatureLabel(override.featureKey, featureDefinitionsByKey)
              : formatPlatformPlanMetric(override?.metricKey)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Le workspace, le type et la capability sont immuables. Créez une nouvelle dérogation pour changer de cible.
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="font-semibold">Valeur appliquée</h3>

        {effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-feature-enabled">État</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-feature-enabled"
              onChange={(event) => setFeatureEnabled(event.target.value === 'true')}
              value={String(featureEnabled)}
            >
              <option value="true">Activée</option>
              <option value="false">Désactivée</option>
            </select>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="override-limit-mode">Mode</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="override-limit-mode"
                onChange={(event) => setLimitMode(event.target.value)}
                value={limitMode}
              >
                <option value="limited">Plafond défini</option>
                <option value="unlimited">Illimité</option>
              </select>
            </div>

            {limitMode === 'limited' && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="override-limit-value">
                  {isByteMetric(effectiveMetric) ? 'Limite en Mo' : 'Limite'}
                </label>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="override-limit-value"
                  min="0"
                  onChange={(event) => setLimitValue(event.target.value)}
                  step={isByteMetric(effectiveMetric) ? '0.01' : '1'}
                  type="number"
                  value={limitValue}
                />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold">Cadre commercial</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="override-source">Origine</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            id="override-source"
            onChange={(event) => setSource(event.target.value)}
            value={source}
          >
            {Object.values(ENTITLEMENT_OVERRIDE_SOURCE).map((value) => (
              <option key={value} value={value}>
                {formatPlatformEntitlementOverrideSource(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-starts-at">Début</label>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-starts-at"
              onChange={(event) => setStartsAt(event.target.value)}
              type="datetime-local"
              value={startsAt}
            />
            <p className="text-xs text-muted-foreground">Vide : prise d’effet immédiate.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-ends-at">Fin</label>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-ends-at"
              onChange={(event) => setEndsAt(event.target.value)}
              type="datetime-local"
              value={endsAt}
            />
            <p className="text-xs text-muted-foreground">Vide : dérogation permanente jusqu’à révocation.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="override-reason">Motif</label>
          <textarea
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="override-reason"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Justification commerciale ou administrative…"
            value={reason}
          />
          <p className="text-xs text-muted-foreground">Obligatoire, 3 à 500 caractères. Visible uniquement dans Platform.</p>
        </div>
      </section>

      {(formError || submitError) && (
        <p className="text-sm text-destructive" role="alert">
          {formError ?? submitError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">
          Annuler
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer la dérogation' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}

export { PlatformEntitlementOverrideForm };
