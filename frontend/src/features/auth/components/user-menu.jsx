import { Gauge, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  useGetCurrentUserQuery,
  useLogoutMutation,
} from '@/features/auth/api/auth-api';
import { PLATFORM_ROLE } from '@/features/platform/constants/platform-roles';

function getInitials(user) {
  const firstInitial = user?.firstName?.trim()?.charAt(0) ?? '';
  const lastInitial = user?.lastName?.trim()?.charAt(0) ?? '';
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  return initials || user?.email?.trim()?.charAt(0)?.toUpperCase() || '?';
}

function getLocationPath(location) {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
}

function UserMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { data: user, isLoading } = useGetCurrentUserQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  useEffect(() => {
    if (!open) return undefined;

    /*
     * Le menu doit se comporter comme un vrai popover de navigation : une
     * interaction extérieure ou Escape le referme sans imposer un second clic
     * sur l'avatar. Les listeners n'existent que pendant l'ouverture afin de
     * ne pas ajouter d'écoute globale permanente à l'application.
     */
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    /*
     * Une navigation peut provenir de la sidebar ou d'un autre composant alors
     * que le menu est encore ouvert. La route devient donc une seconde borne de
     * cycle de vie : le popover ne doit jamais persister sur la page suivante.
     */
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);

  async function handleLogout() {
    setOpen(false);

    try {
      await logout().unwrap();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  function navigateFromMenu(destination, { preserveReturnDestination = false } = {}) {
    setOpen(false);

    if (!preserveReturnDestination) {
      navigate(destination);
      return;
    }

    const accountReturnTo = location.state?.accountReturnTo ?? getLocationPath(location);
    navigate(destination, { state: { accountReturnTo } });
  }

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : 'Compte utilisateur';
  const isSuperAdmin = user?.platformRole === PLATFORM_ROLE.SUPER_ADMIN;
  const isPlatformContext = location.pathname.startsWith('/platform');

  return (
    <div className="relative" ref={rootRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Ouvrir le menu utilisateur"
        className="rounded-full"
        disabled={isLoading || isLoggingOut}
        onClick={() => setOpen((current) => !current)}
        size="icon"
        type="button"
        variant="outline"
      >
        <span className="text-xs font-semibold" aria-hidden="true">
          {getInitials(user)}
        </span>
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          role="menu"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user?.email && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>

          <div className="py-2">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigateFromMenu('/account/profile', { preserveReturnDestination: true })}
              role="menuitem"
              type="button"
            >
              <UserRound aria-hidden="true" className="size-4" />
              Profil
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigateFromMenu('/account/security', { preserveReturnDestination: true })}
              role="menuitem"
              type="button"
            >
              <ShieldCheck aria-hidden="true" className="size-4" />
              Sécurité
            </button>
            {isSuperAdmin && !isPlatformContext && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => navigateFromMenu('/platform/overview')}
                role="menuitem"
                type="button"
              >
                <Gauge aria-hidden="true" className="size-4" />
                Console d’administration
              </button>
            )}
          </div>

          <div className="border-t border-border pt-2">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoggingOut}
              onClick={handleLogout}
              role="menuitem"
              type="button"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { UserMenu, getInitials, getLocationPath };
