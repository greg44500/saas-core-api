import { FeatureToggle } from '@/components/shared/feature-toggle';
import { isByteMetric } from '@/features/platform/lib/platform-plan-limit-utils';

function PlatformPlanCapabilitiesEditor({
  groups,
  features,
  limits,
  metricsByKey,
  onFeatureChange,
  onLimitChange,
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune fonctionnalité ni limite déclarée.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <fieldset className="space-y-3" key={group.key}>
          <legend className="text-sm font-semibold">{group.label}</legend>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {group.features.length > 0 && (
              <div className="divide-y divide-border px-4">
                {group.features.map((feature) => (
                  <div className="py-2" key={feature.key}>
                    <FeatureToggle
                      checked={features.has(feature.key)}
                      helpText={feature.description}
                      label={feature.label}
                      onCheckedChange={(checked) => onFeatureChange(feature.key, checked)}
                    />
                  </div>
                ))}
              </div>
            )}

            {group.metrics.length > 0 && (
              <div className={group.features.length > 0 ? 'border-t border-border' : ''}>
                <div className="bg-muted/30 px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Limites et quotas
                  </p>
                </div>

                <div className="space-y-3 p-4">
                  {group.metrics.map((metric) => {
                    const metricKey = metric.key;
                    const config = limits[metricKey] ?? { mode: 'none', value: '' };
                    const sourceMetric = metricsByKey.get(metricKey) ?? metric;

                    return (
                      <div
                        className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_170px_170px] sm:items-end"
                        key={metricKey}
                      >
                        <div>
                          <div className="text-sm font-medium">{metric.label}</div>
                          {metric.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {metric.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label
                            className="text-xs text-muted-foreground"
                            htmlFor={`platform-plan-limit-mode-${metricKey}`}
                          >
                            Mode
                          </label>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            id={`platform-plan-limit-mode-${metricKey}`}
                            onChange={(event) => onLimitChange(metricKey, {
                              mode: event.target.value,
                            })}
                            value={config.mode}
                          >
                            <option value="none">Aucune</option>
                            <option value="limited">Plafond</option>
                            <option value="unlimited">Illimité</option>
                          </select>
                        </div>

                        {config.mode === 'limited' && (
                          <div className="space-y-1">
                            <label
                              className="text-xs text-muted-foreground"
                              htmlFor={`platform-plan-limit-value-${metricKey}`}
                            >
                              {isByteMetric(sourceMetric) ? 'Valeur (Mo)' : 'Valeur'}
                            </label>
                            <input
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              id={`platform-plan-limit-value-${metricKey}`}
                              min="0"
                              onChange={(event) => onLimitChange(metricKey, {
                                value: event.target.value,
                              })}
                              type="number"
                              value={config.value}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export { PlatformPlanCapabilitiesEditor };
