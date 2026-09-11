import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ENTITLEMENT_OVERRIDE_LIFECYCLE,
  formatPlatformEntitlementOverrideDate,
} from '@/features/platform/lib/platform-entitlement-override-formatters';

function formatRelativeDuration(milliseconds) {
  const absoluteMilliseconds = Math.abs(milliseconds);
  const minutes = Math.max(1, Math.round(absoluteMilliseconds / 60000));

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;

  const days = Math.round(hours / 24);
  return `${days} j`;
}

function getPeriodPresentation(override, now = new Date()) {
  const startsAt = override?.startsAt ? new Date(override.startsAt) : null;
  const endsAt = override?.endsAt ? new Date(override.endsAt) : null;
  const validStart = startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null;
  const validEnd = endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null;

  if (override?.lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED && validStart) {
    return {
      primary: `Dans ${formatRelativeDuration(validStart.getTime() - now.getTime())}`,
      secondary: formatPlatformEntitlementOverrideDate(validStart),
    };
  }

  if (validEnd && override?.lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE) {
    return {
      primary: `${formatRelativeDuration(validEnd.getTime() - now.getTime())} restantes`,
      secondary: formatPlatformEntitlementOverrideDate(validEnd),
    };
  }

  if (validEnd) {
    return {
      primary: override?.lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED
        ? 'Terminée'
        : 'Avec échéance',
      secondary: formatPlatformEntitlementOverrideDate(validEnd),
    };
  }

  return {
    primary: 'Permanente',
    secondary: 'Jusqu’à révocation',
  };
}

function getPeriodTooltip(override) {
  const start = override?.startsAt
    ? formatPlatformEntitlementOverrideDate(override.startsAt)
    : 'Immédiat';
  const end = override?.endsAt
    ? formatPlatformEntitlementOverrideDate(override.endsAt)
    : 'Aucune échéance';

  return `Début : ${start} · Fin : ${end}`;
}

function PlatformEntitlementPeriod({ override }) {
  const presentation = getPeriodPresentation(override);

  return (
    <Tooltip>
      <TooltipTrigger
        className="min-w-0 cursor-help text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="block text-sm font-medium text-foreground">
          {presentation.primary}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {presentation.secondary}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {getPeriodTooltip(override)}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  PlatformEntitlementPeriod,
  formatRelativeDuration,
  getPeriodPresentation,
};
