import { ThemeToggle } from '@/components/shared/theme-toggle';
import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher';

function WorkspaceTopbar({ workspace }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0 md:hidden">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <p className="truncate font-semibold">{workspace.name}</p>
        </div>
        <div className="hidden md:block">
          <WorkspaceSwitcher />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export { WorkspaceTopbar };
