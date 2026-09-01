import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserMenu } from '@/features/auth/components/user-menu';
import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher';

function WorkspaceTopbar({ workspace }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher currentWorkspace={workspace} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export { WorkspaceTopbar };
