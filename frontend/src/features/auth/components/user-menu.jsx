import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  useGetCurrentUserQuery,
  useLogoutMutation,
} from '@/features/auth/api/auth-api';

function getInitials(user) {
  const firstInitial = user?.firstName?.trim()?.charAt(0) ?? '';
  const lastInitial = user?.lastName?.trim()?.charAt(0) ?? '';
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  return initials || user?.email?.trim()?.charAt(0)?.toUpperCase() || '?';
}

function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: user, isLoading } = useGetCurrentUserQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  async function handleLogout() {
    setOpen(false);

    try {
      await logout().unwrap();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : 'Compte utilisateur';

  return (
    <div className="relative">
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
              aria-disabled="true"
              className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground/60"
              disabled
              role="menuitem"
              type="button"
            >
              <UserRound aria-hidden="true" className="size-4" />
              Profil
            </button>
            <button
              aria-disabled="true"
              className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground/60"
              disabled
              role="menuitem"
              type="button"
            >
              <ShieldCheck aria-hidden="true" className="size-4" />
              Sécurité
            </button>
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

export { UserMenu, getInitials };
