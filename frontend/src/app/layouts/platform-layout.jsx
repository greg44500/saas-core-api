import { Outlet } from 'react-router';

import { ThemeToggle } from '@/components/shared/theme-toggle';

function PlatformLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-foreground text-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">
              Console
            </p>
            <p className="font-semibold">Platform</p>
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

export { PlatformLayout };
