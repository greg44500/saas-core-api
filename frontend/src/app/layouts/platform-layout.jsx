import { useState } from 'react';
import { Outlet } from 'react-router';

import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserMenu } from '@/features/auth/components/user-menu';
import { PlatformSidebar } from '@/features/platform/components/platform-sidebar';

function PlatformLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <PlatformSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Console Platform
              </p>
              <p className="font-semibold">Administration globale</p>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="relative z-0 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { PlatformLayout };
