import { StatusBadge } from '@/components/shared/status-badge';
import {
  PLATFORM_WORKSPACE_STATUS_TONE,
  formatPlatformWorkspaceStatus,
} from '@/features/platform/lib/platform-workspace-formatters';

function PlatformWorkspaceStatusBadge({ status }) {
  return (
    <StatusBadge tone={PLATFORM_WORKSPACE_STATUS_TONE[status] ?? 'neutral'}>
      {formatPlatformWorkspaceStatus(status)}
    </StatusBadge>
  );
}

export { PlatformWorkspaceStatusBadge };
