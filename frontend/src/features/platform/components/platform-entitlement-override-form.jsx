import { useEffect, useMemo, useState } from 'react';

import { DateTimePicker } from '@/components/forms/date-time-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getRequiredLimitValue,
  isOperationalValueSufficient,
  PlatformFeatureLimitConfiguration,
} from '@/features/platform/components/platform-feature-limit-configuration';
import { PlatformFeatureSelector } from '@/features/platform/components/platform-feature-selector';
import { PlatformMetricLimitControl } from '@/features/platform/components/platform-metric-limit-control';
import {
  ENTITLEMENT_OVERRIDE_SOURCE,
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideSource,
} from '@/features/platform/lib/platform-entitlement-override-formatters';
import {
  formatPlatformPlanFeature,
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

const EXCEPTION_KIND = Object.freeze({
  GRANT_FEATURE: 'grant_feature',
  SUSPEND_FEATURE: 'suspend_feature',
  ADJUST_LIMIT: 'adjust_limit',
});

function getFeatureLabel(featureKey, definitionsByKey) {
  return definitionsByKey.get(featureKey)?.label
    ?? formatPlatformPlanFeature(featureKey);
}

function getInitialPolicyValue(metric, minimumValue = 0) {
  const policy = metric?.overridePolicy;

  if (policy?.control === 'linear_slider') {
    return Math.min(
      policy.max,
      Math.max(policy.min, minimumValue ?? policy.min),
    );
  }

  if (policy?.control === 'preset_slider') {
    return policy.values.find((value) => value >= (minimumValue ?? 0))
      ?? policy.values.at(-1)
      ?? 0;
  }

  return Math.max(0, minimumValue ?? 0);
}

function isLimitValueAllowedByPolicy(metric, limitValue) {
  const policy = metric?.overridePolicy;
  if (!policy) return true;

  if (limitValue === null) return policy.allowUnlimited === true;
  if (!Number.isInteger(limitValue) || limitValue < 0) return false;

  if (policy.control === 'linear_slider') {
    return limitValue >= policy.min
      && limitValue <= policy.max
      && (limitValue - policy.min) % policy.step === 0;
  }

  if (policy.control === 'preset_slider') {
    return policy.values.includes(limitValue);
  }

  return false;
}

function parseLimitValue({ value, mode, metric }) {
  const limitValue = mode === 'unlimited' ? null : Number(value);

  if (
    limitValue !== null
    && (!Number.isInteger(limitValue) || limitValue < 0)
  ) {
    throw new Error('La limite doit être un entier positif ou nul.');
  }

  if (!isLimitValueAllowedByPolicy(metric, limitValue)) {
    throw new Error(
      'La limite demandée dépasse les garde-fous autorisés pour cette métrique.',
    );
  }

  return limitValue;
}

function PlatformEntitlementOverrideForm({
  capabilities,
  entitlementContext = null,
  featureGroup = null,
  mode,
  onCancel,
  onSubmit,
  override = null,
  pending = false,
  submitError = null,
  workspaceId = null,
}) {
  const featureDefinitions = capabilities?.featureDefinitions ?? [];
  const featureDefinitionsByKey = useMemo(
    () => new Map(
      featureDefinitions.map((definition) => [definition.key, definition]),
    ),
    [featureDefinitions],
  );
  const metrics = capabilities?.metrics ?? [];
  const metricsByKey = useMemo(
    () => new Map(metrics.map((metric) => [metric.key, metric])),
    [metrics],
  );
  const effectiveFeatureSet = useMemo(
    () => new Set(entitlementContext?.effective?.features ?? []),
    [entitlementContext],
  );
  const grantableFeatures = useMemo(
    () => (capabilities?.features ?? []).filter(
      (candidateKey) => !effectiveFeatureSet.has(candidateKey),
    ),
    [capabilities, effectiveFeatureSet],
  );
  const suspendableFeatures = useMemo(
    () => (capabilities?.features ?? []).filter(
      (candidateKey) => effectiveFeatureSet.has(candidateKey),
    ),
    [capabilities, effectiveFeatureSet],
  );

  const [formError, setFormError] = useState(null);
  const [exceptionKind, setExceptionKind] = useState(EXCEPTION_KIND.GRANT_FEATURE);
  const [featureKey, setFeatureKey] = useState(override?.featureKey ?? '');
  const [metricKey, setMetricKey] = useState(
    override?.metricKey ?? metrics?.[0]?.key ?? '',
  );
  const [featureEnabled, setFeatureEnabled] = useState(
    override?.featureEnabled ?? true,
  );
  const [groupName, setGroupName] = useState(
    featureGroup?.groupName ?? override?.groupName ?? '',
  );
  const [relatedLimits, setRelatedLimits] = useState({});
  const [limitMode, setLimitMode] = useState(
    override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT
      && override?.limitValue === null
      ? 'unlimited'
      : 'limited',
  );
  const [limitValue, setLimitValue] = useState(
    override?.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT
      ? override?.limitValue
      : null,
  );
  const [source, setSource] = useState(
    override?.source ?? ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
  );
  const [startsAt, setStartsAt] = useState(override?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(override?.endsAt ?? '');
  const [reason, setReason] = useState(override?.reason ?? '');

  const featureCandidates = exceptionKind === EXCEPTION_KIND.SUSPEND_FEATURE
    ? suspendableFeatures
    : grantableFeatures;

  useEffect(() => {
    if (mode !== 'create' || exceptionKind === EXCEPTION_KIND.ADJUST_LIMIT) return;

    setFeatureKey((current) => (
      featureCandidates.includes(current)
        ? current
        : featureCandidates[0] ?? ''
    ));
  }, [exceptionKind, featureCandidates, mode]);

  const effectiveTargetType = mode === 'edit'
    ? override?.targetType
    : exceptionKind === EXCEPTION_KIND.ADJUST_LIMIT
      ? ENTITLEMENT_OVERRIDE_TARGET.LIMIT
      : ENTITLEMENT_OVERRIDE_TARGET.FEATURE;
  const createFeatureEnabled = exceptionKind === EXCEPTION_KIND.GRANT_FEATURE;
  const effectiveMetricKey = mode === 'edit' ? override?.metricKey : metricKey;
  const effectiveMetric = metricsByKey.get(effectiveMetricKey);
  const selectedFeatureDefinition = featureDefinitionsByKey.get(featureKey);
  const associatedMetricKeys = useMemo(
    () => selectedFeatureDefinition?.metricKeys ?? [],
    [selectedFeatureDefinition],
  );
  const isGroupedFeatureCreate = mode === 'create'
    && effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
    && createFeatureEnabled;
  const isGroupedFeatureEdit = mode === 'edit'
    && effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
    && Boolean(featureGroup?.groupId);
  const managesFeatureLimits = isGroupedFeatureCreate || isGroupedFeatureEdit;

  useEffect(() => {
    if (
      mode !== 'create'
      || effectiveTargetType !== ENTITLEMENT_OVERRIDE_TARGET.LIMIT
      || !effectiveMetric
    ) {
      return;
    }

    const effectiveValue = entitlementContext?.effective?.limits?.[effectiveMetricKey];
    const policy = effectiveMetric.overridePolicy;

    if (effectiveValue === null && policy?.allowUnlimited === true) {
      setLimitMode('unlimited');
      setLimitValue(null);
      return;
    }

    setLimitMode('limited');
    setLimitValue(
      Number.isInteger(effectiveValue)
        && isLimitValueAllowedByPolicy(effectiveMetric, effectiveValue)
        ? effectiveValue
        : getInitialPolicyValue(effectiveMetric),
    );
  }, [
    effectiveMetric,
    effectiveMetricKey,
    effectiveTargetType,
    entitlementContext,
    mode,
  ]);

  useEffect(() => {
    if (!managesFeatureLimits) {
      setRelatedLimits({});
      return;
    }

    const existingByMetric = new Map(
      (featureGroup?.relatedOverrides ?? []).map(
        (item) => [item.metricKey, item],
      ),
    );
    const requiredLimits =
      selectedFeatureDefinition?.overridePolicy?.requiredLimits ?? {};

    setRelatedLimits(Object.fromEntries(
      associatedMetricKeys.map((key) => {
        const metric = metricsByKey.get(key);
        const existing = existingByMetric.get(key);
        const effectiveValue = entitlementContext?.effective?.limits?.[key];
        const usageValue = entitlementContext?.usage?.[key] ?? 0;
        const requirement = requiredLimits?.[key] ?? {};
        const minimumRequiredValue = getRequiredLimitValue(requirement, usageValue);
        const effectiveNeedsAdjustment = !isOperationalValueSufficient(
          effectiveValue,
          requirement,
          usageValue,
        );
        const existingValue = existing?.limitValue;
        const existingIsAllowed = existing
          ? isLimitValueAllowedByPolicy(metric, existingValue)
          : false;
        const existingIsOperational = existing
          ? isOperationalValueSufficient(existingValue, requirement, usageValue)
          : false;
        const policy = metric?.overridePolicy;
        const canKeepUnlimited = existingValue === null
          && policy?.allowUnlimited === true;
        const shouldNormalizeExisting = Boolean(existing)
          && (!existingIsAllowed || (featureEnabled && !existingIsOperational));
        const value = existing && !shouldNormalizeExisting
          ? existingValue
          : effectiveNeedsAdjustment || shouldNormalizeExisting
            ? getInitialPolicyValue(metric, minimumRequiredValue)
            : Number.isInteger(effectiveValue)
              && isLimitValueAllowedByPolicy(metric, effectiveValue)
              ? effectiveValue
              : getInitialPolicyValue(metric, minimumRequiredValue);

        return [
          key,
          {
            enabled: Boolean(existing) || effectiveNeedsAdjustment,
            locked: Boolean(existing),
            mode: canKeepUnlimited && !shouldNormalizeExisting
              ? 'unlimited'
              : 'limited',
            value,
          },
        ];
      }),
    ));
  }, [
    associatedMetricKeys,
    entitlementContext,
    featureEnabled,
    featureGroup,
    managesFeatureLimits,
    metricsByKey,
    selectedFeatureDefinition,
  ]);

  function updateRelatedLimit(metricKeyToUpdate, patch) {
    setRelatedLimits((current) => ({
      ...current,
      [metricKeyToUpdate]: {
        ...current[metricKeyToUpdate],
        ...patch,
      },
    }));
  }

  function buildRelatedLimitsPayload() {
    return associatedMetricKeys
      .filter((key) => relatedLimits[key]?.enabled)
      .map((key) => ({
        metricKey: key,
        limitValue: parseLimitValue({
          value: relatedLimits[key]?.value,
          mode: relatedLimits[key]?.mode,
          metric: metricsByKey.get(key),
        }),
      }));
  }

  const hasOperationalLimitGap = useMemo(() => {
    if (!managesFeatureLimits) return false;
    if (isGroupedFeatureEdit && featureEnabled === false) return false;

    const requiredLimits =
      selectedFeatureDefinition?.overridePolicy?.requiredLimits ?? {};

    return Object.entries(requiredLimits).some(([
      requiredMetricKey,
      requiredPolicy,
    ]) => {
      const configuration = relatedLimits[requiredMetricKey];
      const currentEffectiveValue =
        entitlementContext?.effective?.limits?.[requiredMetricKey];
      const usageValue = entitlementContext?.usage?.[requiredMetricKey] ?? 0;
      const projectedValue = configuration?.enabled
        ? configuration.mode === 'unlimited'
          ? null
          : configuration.value
        : currentEffectiveValue;

      return !isOperationalValueSufficient(
        projectedValue,
        requiredPolicy,
        usageValue,
      );
    });
  }, [
    entitlementContext,
    featureEnabled,
    isGroupedFeatureEdit,
    managesFeatureLimits,
    relatedLimits,
    selectedFeatureDefinition,
  ]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    try {
      const normalizedReason = reason.trim();
      if (normalizedReason.length < 3 || normalizedReason.length > 500) {
        throw new Error('Le motif doit contenir entre 3 et 500 caractères.');
      }

      if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
        throw new Error('La fin de la dérogation doit être postérieure à son début.');
      }

      if (hasOperationalLimitGap) {
        throw new Error(
          'Une limite associée doit être augmentée pour rendre la fonctionnalité réellement utilisable.',
        );
      }

      const payload = {
        source,
        reason: normalizedReason,
        ...(startsAt ? { startsAt } : {}),
        endsAt: endsAt || null,
      };

      if (mode === 'create') {
        if (!workspaceId) {
          throw new Error('Sélectionnez un workspace avant de créer une dérogation exceptionnelle.');
        }

        payload.workspaceId = workspaceId;
        payload.targetType = effectiveTargetType;
      }

      if (effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        if (mode === 'create') {
          if (!featureKey) {
            throw new Error('Aucune fonctionnalité n’est disponible pour cette nature de dérogation.');
          }
          payload.featureKey = featureKey;
          payload.featureEnabled = createFeatureEnabled;
        } else {
          payload.featureEnabled = featureEnabled;
        }

        if (managesFeatureLimits) {
          const normalizedGroupName = groupName.trim();
          if (normalizedGroupName.length < 3 || normalizedGroupName.length > 120) {
            throw new Error('Le nom de la dérogation doit contenir entre 3 et 120 caractères.');
          }

          payload.groupName = normalizedGroupName;
          payload.relatedLimits = buildRelatedLimitsPayload();
        }
      } else {
        if (mode === 'create') {
          if (!metricKey) throw new Error('Sélectionnez une métrique.');
          payload.metricKey = metricKey;
        }

        payload.limitValue = parseLimitValue({
          value: limitValue,
          mode: limitMode,
          metric: effectiveMetric,
        });
      }

      await onSubmit(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Le formulaire est invalide.');
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {mode === 'create' ? (
        <section className="space-y-4">
          <h3 className="font-semibold">Nature de l’exception</h3>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <p>
              <span className="font-medium">Workspace :</span>{' '}
              {entitlementContext?.workspace?.name ?? '—'}
            </p>
            <p className="mt-1">
              <span className="font-medium">Plan actuel :</span>{' '}
              {entitlementContext?.plan?.name ?? '—'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-exception-kind">Nature</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-exception-kind"
              onChange={(event) => setExceptionKind(event.target.value)}
              value={exceptionKind}
            >
              <option value={EXCEPTION_KIND.GRANT_FEATURE}>
                Accorder une fonctionnalité actuellement inactive
              </option>
              <option value={EXCEPTION_KIND.SUSPEND_FEATURE}>
                Suspendre une fonctionnalité actuellement active
              </option>
              <option value={EXCEPTION_KIND.ADJUST_LIMIT}>
                Modifier exceptionnellement une limite
              </option>
            </select>
          </div>

          {effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE ? (
            <div className="space-y-3">
              {featureCandidates.length === 0 ? (
                <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Aucune fonctionnalité ne correspond actuellement à cette nature de dérogation.
                </p>
              ) : (
                <PlatformFeatureSelector
                  definitions={featureDefinitions}
                  featureKeys={featureCandidates}
                  onChange={setFeatureKey}
                  value={featureKey}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {createFeatureEnabled
                  ? 'Seules les fonctionnalités actuellement inactives sont proposées.'
                  : 'Seules les fonctionnalités actuellement actives sont proposées.'}
              </p>
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
          <p>
            <span className="font-medium">Workspace :</span>{' '}
            {override?.workspace?.name ?? '—'}
          </p>
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

      {managesFeatureLimits && (
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-group-name">
              Nom de la dérogation
            </label>
            <Input
              id="override-group-name"
              maxLength={120}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Ex. Découverte Gestion d’équipe"
              value={groupName}
            />
            <p className="text-xs text-muted-foreground">
              Ce nom identifie la décision commerciale dans l’administration Platform.
            </p>
          </div>

          {selectedFeatureDefinition && (
            <PlatformFeatureLimitConfiguration
              effectiveLimits={entitlementContext?.effective?.limits ?? {}}
              featureDefinition={selectedFeatureDefinition}
              featureEnabled={featureEnabled}
              metricsByKey={metricsByKey}
              onFeatureEnabledChange={setFeatureEnabled}
              onUpdateRelatedLimit={updateRelatedLimit}
              planLimits={entitlementContext?.plan?.limits ?? {}}
              relatedLimits={relatedLimits}
              showFeatureState={isGroupedFeatureEdit}
              usage={entitlementContext?.usage ?? {}}
            />
          )}
        </section>
      )}

      {(mode === 'edit'
        && effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
        && !isGroupedFeatureEdit) && (
        <section className="space-y-4">
          <h3 className="font-semibold">Valeur appliquée</h3>
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
        </section>
      )}

      {effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT && (
        <section className="space-y-4">
          <h3 className="font-semibold">Valeur appliquée</h3>
          {effectiveMetric && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">
                  {effectiveMetric.presentation?.label
                    ?? formatPlatformPlanMetric(effectiveMetric.key)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Plan : {formatPlatformPlanLimit(
                    effectiveMetric.key,
                    entitlementContext?.plan?.limits?.[effectiveMetric.key],
                  )} · Effectif : {formatPlatformPlanLimit(
                    effectiveMetric.key,
                    entitlementContext?.effective?.limits?.[effectiveMetric.key],
                  )} · Utilisé : {formatPlatformPlanLimit(
                    effectiveMetric.key,
                    entitlementContext?.usage?.[effectiveMetric.key] ?? 0,
                  )}
                </p>
              </div>

              <PlatformMetricLimitControl
                idPrefix="override-limit"
                metric={effectiveMetric}
                mode={limitMode}
                onModeChange={setLimitMode}
                onValueChange={setLimitValue}
                value={limitValue}
              />
            </div>
          )}
        </section>
      )}

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
            <p className="text-sm font-medium">Début</p>
            <DateTimePicker
              id="override-starts-at"
              onChange={setStartsAt}
              value={startsAt}
            />
            <p className="text-xs text-muted-foreground">Vide : prise d’effet immédiate.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Fin</p>
            <DateTimePicker
              id="override-ends-at"
              onChange={setEndsAt}
              value={endsAt}
            />
            <p className="text-xs text-muted-foreground">
              Vide : dérogation permanente jusqu’à révocation. À l’échéance, le workspace revient automatiquement à l’état courant de son plan.
            </p>
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
          <p className="text-xs text-muted-foreground">
            Obligatoire, 3 à 500 caractères. Visible uniquement dans Platform.
          </p>
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
        <Button
          disabled={pending || hasOperationalLimitGap || (
            mode === 'create'
            && effectiveTargetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
            && !featureKey
          )}
          type="submit"
        >
          {pending
            ? 'Enregistrement…'
            : mode === 'create'
              ? 'Créer la dérogation exceptionnelle'
              : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}

export { EXCEPTION_KIND, PlatformEntitlementOverrideForm };
