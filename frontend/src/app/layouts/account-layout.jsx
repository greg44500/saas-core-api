import { ArrowLeft } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/features/auth/components/user-menu';
import { getAuthenticatedHome } from '@/features/auth/lib/authenticated-destination';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';

const accountNavigationItems = [
  { label: 'Profil', path: '/account/profile' },
  { label: 'Sécurité', path: '/account/security' },
];

function AccountLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const fallbackDestination = getAuthenticatedHome(platformAccess);
  const returnDestination = location.state?.accountReturnTo ?? fallbackDestination;
  const accountNavigationState = { accountReturnTo: returnDestination };

  function handleReturn() {
    navigate(returnDestination, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button onClick={handleReturn} type="button" variant="ghost">
              <ArrowLeft aria-hidden="true" />
              Retour à l’application
            </Button>
            <div className="hidden min-w-0 border-l border-border pl-3 sm:block">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Compte</p>
              <p className="truncate font-semibold">Paramètres personnels</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <nav aria-label="Navigation du compte" className="space-y-1">
          {accountNavigationItems.map(({ label, path }) => (
            <NavLink
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              key={path}
              state={accountNavigationState}
              to={path}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { AccountLayout, accountNavigationItems };
