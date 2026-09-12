import { Outlet } from 'react-router';

import { workspaceNavigation } from '@/app/workspace-navigation';
import { DashboardDisplayPreviewProvider } from '@/components/shared/dashboard-display-preview-context';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';
import { WorkspaceTopbar } from '@/features/workspace/components/workspace-topbar';

function WorkspaceLayout() {
  const { workspace } = useWorkspaceContext();

  return (
    <DashboardDisplayPreviewProvider>
      <SidebarProvider>
        <WorkspaceSidebar
          navigation={workspaceNavigation}
          workspace={workspace}
        />
        <div className="min-w-0 flex-1">
          <WorkspaceTopbar
            sidebarTrigger={<SidebarTrigger className="md:hidden" />}
            workspace={workspace}
          />
          <main className="relative z-0 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </DashboardDisplayPreviewProvider>
  );
}

export { WorkspaceLayout };
