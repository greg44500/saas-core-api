import { useMemo } from 'react';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';
import { InfoTooltip } from '@/components/shared/info-tooltip';
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

  const summary = (
    <p className="text-sm text-muted-foreground">
      {activeFeatures.length} fonctionnalité{activeFeatures.length > 1 ? 's' : ''} disponible{activeFeatures.length > 1 ? 's' : ''} sur ce workspace.
    </p>
  );

  return (
    <CollapsibleCard
      closeLabel="Replier les fonctionnalités actives"
      defaultOpen
      description="Vue de lecture des fonctionnalités réellement disponibles sur le workspace et de leurs principaux paramètres effectifs."
      openLabel="Afficher les fonctionnalités actives"
      summary={summary}
      title="Fonctionnalités actives"
    >
      {activeFeatures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune fonctionnalité active pour ce workspace.
        </p>
      ) : (
        <ul className="-mx-5 -my-4 divide-y divide-border">
          {activeFeatures.map((feature) => (
            <li className="px-5 py-3" key={feature.key}>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {feature.label}
                    </p>
                    <InfoTooltip
                      content={feature.description}
                      label={`Informations sur ${feature.label}`}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Source : {feature.source}
                  </p>
                </div>

                {feature.metricKeys.length > 0 && (
                  <div className="text-left text-xs text-muted-foreground sm:shrink-0 sm:text-right">
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
    </CollapsibleCard>
  );
}

export { PlatformWorkspaceFeatureOverrides };
