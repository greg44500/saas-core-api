import { Outlet, useParams } from 'react-router';

import { ThemeToggle } from '@/components/shared/theme-toggle';

function WorkspaceLayout() {
  const { workspaceId } = useParams();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Workspace
            </p>
            <p className="font-semibold">{workspaceId}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export { WorkspaceLayout };
