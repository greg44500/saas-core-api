import { ChevronDown, Info } from 'lucide-react';
import { useMemo } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGetPlatformEntitlementContextQuery } from '@/features/platform/api/platform-entitlement-overrides-api';
import {
  ENTITLEMENT_OVERRIDE_TARGET,
} from '@/features/platform/lib/platform-entitlement-override-formatters';
import {
  formatPlatformPlanFeature,
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

function PlatformWorkspaceFeatureOverrides({ capabilities, workspaceId }) {
  const contextQuery = useGetPlatformEntitlementContextQuery(workspaceId, {
    skip: !workspaceId,
  });

  const featureDefinitionsByKey = useMemo(
    () => new Map(
      (capabilities?.featureDefinitions ?? []).map((definition) => [definition.key, definition]),
    ),
    [capabilities],
  );
  const metricsByKey = useMemo(
    () => new Map(
      (capabilities?.metrics ?? []).map((metric) => [metric.key, metric]),
    ),
    [capabilities],
  );

  if (!workspaceId) return null;

  if (contextQuery.isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Chargement des fonctionnalités actives…</p>
      </section>
    );
  }

  if (contextQuery.error || !contextQuery.data) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les fonctionnalités actives de ce workspace.
        </p>
      </section>
    );
  }

  const context = contextQuery.data;
  const planFeatures = new Set(context.plan?.features ?? []);
  const appliedFeatureOverrides = new Map(
    (context.appliedOverrides ?? [])
      .filter((override) => override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE)
      .map((override) => [override.featureKey, override]),
  );

  const activeFeatures = (context.effective?.features ?? []).map((featureKey) => {
    const definition = featureDefinitionsByKey.get(featureKey);
    const appliedOverride = appliedFeatureOverrides.get(featureKey) ?? null;

    return {
      key: featureKey,
      label: definition?.label ?? formatPlatformPlanFeature(featureKey),
      description: definition?.description ?? null,
      metricKeys: definition?.metricKeys ?? [],
      source: appliedOverride
        ? `Dérogation${appliedOverride.groupName ? ` « ${appliedOverride.groupName} »` : ''}`
        : planFeatures.has(featureKey)
          ? `Plan ${context.plan?.name ?? 'courant'}`
          : 'Droit effectif',
    };
  });

  return (
    <details className="group rounded-xl border border-border bg-card" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold">Fonctionnalités actives</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeFeatures.length} fonctionnalité{activeFeatures.length > 1 ? 's' : ''} disponible{activeFeatures.length > 1 ? 's' : ''} sur ce workspace.
          </p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="border-t border-border">
        {activeFeatures.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Aucune fonctionnalité active pour ce workspace.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activeFeatures.map((feature) => (
              <li className="px-5 py-3" key={feature.key}>
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {feature.label}
                      </p>
                      {feature.description && (
                        <Tooltip>
                          <TooltipTrigger
                            aria-label={`Informations sur ${feature.label}`}
                            className="inline-flex shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Info aria-hidden="true" className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent>{feature.description}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Source : {feature.source}
                    </p>
                  </div>

                  {feature.metricKeys.length > 0 && (
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      {feature.metricKeys.map((metricKey) => {
                        const metric = metricsByKey.get(metricKey);
                        const label = metric?.presentation?.label
                          ?? formatPlatformPlanMetric(metricKey);
                        const effectiveValue = context.effective?.limits?.[metricKey];
                        const usageValue = context.usage?.[metricKey];

                        return (
                          <p key={metricKey}>
                            <span className="font-medium text-foreground">{label} :</span>{' '}
                            {formatPlatformPlanLimit(metricKey, effectiveValue)}
                            {Number.isFinite(usageValue)
                              ? ` · ${formatPlatformPlanLimit(metricKey, usageValue)} utilisé${usageValue > 1 ? 's' : ''}`
                              : ''}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export { PlatformWorkspaceFeatureOverrides };
