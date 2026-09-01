import { useState } from 'react';
import { Outlet } from 'react-router';

import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';
import { WorkspaceTopbar } from '@/features/workspace/components/workspace-topbar';

function WorkspaceLayout() {
  const { workspace } = useWorkspaceContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <WorkspaceSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        workspace={workspace}
      />
      <div className="min-w-0 flex-1">
        <WorkspaceTopbar workspace={workspace} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { WorkspaceLayout };
