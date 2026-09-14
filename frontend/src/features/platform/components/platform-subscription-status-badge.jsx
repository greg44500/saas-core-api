import { StatusBadge } from '@/components/shared/status-badge';
import {
  PLATFORM_SUBSCRIPTION_STATUS_TONE,
  formatPlatformSubscriptionStatus,
} from '@/features/platform/lib/platform-subscription-formatters';

function PlatformSubscriptionStatusBadge({ status }) {
  return (
    <StatusBadge tone={PLATFORM_SUBSCRIPTION_STATUS_TONE[status] ?? 'neutral'}>
      {formatPlatformSubscriptionStatus(status)}
    </StatusBadge>
  );
}

export { PlatformSubscriptionStatusBadge };
