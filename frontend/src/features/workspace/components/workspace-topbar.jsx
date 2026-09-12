import { useLocation } from 'react-router';

import { useGetWorkspaceSubscriptionQuery } from '@/features/subscription/api/subscription-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WorkspaceDashboardDisplayPreferences } from '@/features/workspace/components/workspace-dashboard-display-preferences';
import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher';
import { WorkspaceUserIdentity } from '@/features/workspace/components/workspace-user-identity';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

function WorkspaceTopbar({ sidebarTrigger = null, workspace }) {
  const { can } = useWorkspaceContext();
  const location = useLocation();
  const canReadSubscription = can(WORKSPACE_PERMISSION.SUBSCRIPTION_READ);
  const { data: subscription } = useGetWorkspaceSubscriptionQuery(workspace.id, {
    skip: !canReadSubscription,
  });
  const planName = subscription?.effectiveEntitlement?.plan?.name ?? null;
  const isDashboard = location.pathname === `/workspaces/${workspace.id}/dashboard`;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
        {sidebarTrigger}
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentWorkspace={workspace} />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isDashboard && <WorkspaceDashboardDisplayPreferences />}
          <WorkspaceUserIdentity planName={planName} />
        </div>
      </div>
    </header>
  );
}

export { WorkspaceTopbar };
