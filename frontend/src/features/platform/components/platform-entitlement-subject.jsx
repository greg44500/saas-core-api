import { Info } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideCapability,
  formatPlatformEntitlementOverrideValue,
} from '@/features/platform/lib/platform-entitlement-override-formatters';
import {
  formatPlatformPlanFeature,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

function findFeatureForMetric(featureDefinitions, metricKey) {
  return featureDefinitions.find((definition) =>
    (definition.metricKeys ?? []).includes(metricKey));
}

function PlatformEntitlementSubject({
  featureDefinitions = [],
  override,
}) {
  if (!override) return '—';

  if (override.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
    const featureDefinition = findFeatureForMetric(
      featureDefinitions,
      override.metricKey,
    );
    const featureLabel = featureDefinition?.label
      ?? (featureDefinition?.key ? formatPlatformPlanFeature(featureDefinition.key) : null);
    const metricLabel = formatPlatformPlanMetric(override.metricKey);

    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {featureLabel ?? metricLabel}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {featureLabel ? `${metricLabel} : ` : ''}{formatPlatformEntitlementOverrideValue(override)}
        </p>
      </div>
    );
  }

  const definition = featureDefinitions.find(
    (item) => item.key === override.featureKey,
  );
  const label = definition?.label
    ?? formatPlatformEntitlementOverrideCapability(override);
  const relatedOverrides = override.relatedOverrides ?? [];
  const hasTooltip = Boolean(definition?.description || relatedOverrides.length > 0);

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {hasTooltip && (
          <Tooltip>
            <TooltipTrigger
              aria-label={`Informations sur ${label}`}
              className="inline-flex shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info aria-hidden="true" className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="space-y-1">
              {definition?.description && <p>{definition.description}</p>}
              {relatedOverrides.length > 0 && (
                <div>
                  <p className="font-semibold">Paramètres associés</p>
                  {relatedOverrides.map((relatedOverride) => (
                    <p key={relatedOverride.id ?? relatedOverride.metricKey}>
                      {formatPlatformPlanMetric(relatedOverride.metricKey)} :{' '}
                      {formatPlatformEntitlementOverrideValue(relatedOverride)}
                    </p>
                  ))}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {override.groupName && (
        <p className="truncate text-xs text-muted-foreground">
          {override.groupName}
        </p>
      )}
    </div>
  );
}

export { PlatformEntitlementSubject, findFeatureForMetric };
