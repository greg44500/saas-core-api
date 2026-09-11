import { PlatformMetricLimitControl } from '@/features/platform/components/platform-metric-limit-control';
import {
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';


function getRequiredLimitValue(requirement = {}, usage = 0) {
  const minimumEffectiveValue = requirement.minimumEffectiveValue ?? 0;
  const minimumHeadroom = requirement.minimumHeadroom ?? 0;

  return Math.max(
    minimumEffectiveValue,
    usage + minimumHeadroom,
  );
}

function isOperationalValueSufficient(value, requirement = {}, usage = 0) {
  if (!requirement || Object.keys(requirement).length === 0) return true;
  if (value === null) return true;

  return Number.isInteger(value)
    && value >= getRequiredLimitValue(requirement, usage);
}

function PlatformFeatureLimitConfiguration({
  effectiveLimits = {},
  featureDefinition,
  metricsByKey,
  onUpdateRelatedLimit,
  planLimits = {},
  relatedLimits,
  usage = {},
}) {
  const metricKeys = featureDefinition?.metricKeys ?? [];
  const featureLabel = featureDefinition?.label ?? featureDefinition?.key ?? 'Fonctionnalité';
  const featureDescription = featureDefinition?.description ?? null;
  const requiredLimits = featureDefinition?.overridePolicy?.requiredLimits ?? {};

  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="space-y-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{featureLabel}</p>
            {featureDescription && (
              <p className="mt-1 text-sm text-muted-foreground">
                {featureDescription}
              </p>
            )}
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {metricKeys.length === 0
              ? 'Aucune limite associée'
              : `${metricKeys.length} limite${metricKeys.length > 1 ? 's' : ''} associée${metricKeys.length > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {metricKeys.length > 0 && (
        <details className="border-t border-border" open>
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
            Limites et quotas de cette fonctionnalité
          </summary>

          <div className="space-y-3 border-t border-border bg-muted/20 p-4">
            {metricKeys.map((metricKey) => {
              const metric = metricsByKey.get(metricKey);
              const configuration = relatedLimits[metricKey] ?? {};
              const planValue = planLimits?.[metricKey];
              const effectiveValue = effectiveLimits?.[metricKey];
              const usageValue = usage?.[metricKey] ?? 0;
              const requirement = requiredLimits?.[metricKey] ?? {};
              const minimumRequiredValue = getRequiredLimitValue(
                requirement,
                usageValue,
              );
              const hasRequirement = Object.keys(requirement).length > 0;
              const needsAdjustment = !isOperationalValueSufficient(
                effectiveValue,
                requirement,
                usageValue,
              );
              const forceEnabled = Boolean(configuration.locked || needsAdjustment);
              const label = metric?.presentation?.label
                ?? formatPlatformPlanMetric(metricKey);

              return (
                <div
                  className="space-y-3 rounded-lg border border-border bg-background p-3"
                  key={metricKey}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Plan : {formatPlatformPlanLimit(metricKey, planValue)} · Effectif : {formatPlatformPlanLimit(metricKey, effectiveValue)} · Utilisé : {formatPlatformPlanLimit(metricKey, usageValue)}
                      </p>
                      {hasRequirement && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Minimum nécessaire après usage : {formatPlatformPlanLimit(metricKey, minimumRequiredValue)}
                        </p>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={Boolean(configuration.enabled)}
                        disabled={forceEnabled}
                        onChange={(event) => onUpdateRelatedLimit(metricKey, {
                          enabled: event.target.checked,
                        })}
                        type="checkbox"
                      />
                      {configuration.locked
                        ? 'Dérogation liée'
                        : needsAdjustment
                          ? 'Ajustement requis'
                          : 'Ajuster cette limite'}
                    </label>
                  </div>

                  {needsAdjustment && (
                    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
                      La capacité restante est insuffisante pour utiliser réellement cette fonctionnalité. Une nouvelle limite est obligatoire pour valider la dérogation.
                    </p>
                  )}

                  {configuration.enabled ? (
                    <PlatformMetricLimitControl
                      idPrefix={`override-related-limit-${metricKey}`}
                      metric={metric}
                      minimumValue={hasRequirement ? minimumRequiredValue : null}
                      mode={configuration.mode ?? 'limited'}
                      onModeChange={(mode) => onUpdateRelatedLimit(metricKey, { mode })}
                      onValueChange={(value) => onUpdateRelatedLimit(metricKey, { value })}
                      value={configuration.value}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sans dérogation de limite, la valeur effective actuelle sera conservée.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}


export {
  PlatformFeatureLimitConfiguration,
  getRequiredLimitValue,
  isOperationalValueSufficient,
};
