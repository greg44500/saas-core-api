import { StatusBadge } from '@/components/data-display/status-badge';
import {
  ENTITLEMENT_OVERRIDE_LIFECYCLE,
  formatPlatformEntitlementOverrideLifecycle,
} from '@/features/platform/lib/platform-entitlement-override-formatters';

function getPlatformEntitlementLifecycleTone(lifecycle) {
  if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE) return 'success';
  if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED) return 'info';
  if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED) return 'archive';
  if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED) return 'archive';
  return 'neutral';
}

function getPlatformEntitlementEffectTone(override) {
  if (override?.targetType !== 'feature') return 'info';
  return override.featureEnabled ? 'success' : 'warning';
}

function PlatformEntitlementLifecycleBadge({ lifecycle }) {
  return (
    <StatusBadge tone={getPlatformEntitlementLifecycleTone(lifecycle)}>
      {formatPlatformEntitlementOverrideLifecycle(lifecycle)}
    </StatusBadge>
  );
}

function PlatformEntitlementEffectBadge({ override, children }) {
  return (
    <StatusBadge tone={getPlatformEntitlementEffectTone(override)}>
      {children}
    </StatusBadge>
  );
}

export {
  PlatformEntitlementEffectBadge,
  PlatformEntitlementLifecycleBadge,
  getPlatformEntitlementEffectTone,
  getPlatformEntitlementLifecycleTone,
};
