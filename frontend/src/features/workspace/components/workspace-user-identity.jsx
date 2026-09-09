import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import { LogoutShortcut } from '@/features/auth/components/logout-shortcut';
import { UserMenu } from '@/features/auth/components/user-menu';

function getUserDisplayName(user) {
  if (!user) return 'Compte utilisateur';

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'Compte utilisateur';
}

function WorkspaceUserIdentity({ planName }) {
  const { data: user } = useGetCurrentUserQuery();
  const displayName = getUserDisplayName(user);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 items-center rounded-xl border border-border bg-card/70 p-1 text-card-foreground shadow-sm">
        <UserMenu />

        <div className="hidden min-w-0 px-2 sm:block">
          <p className="max-w-48 truncate text-sm font-semibold">{displayName}</p>
          {planName && (
            <p className="truncate text-xs text-muted-foreground">Plan {planName}</p>
          )}
        </div>
      </div>

      <LogoutShortcut />
    </div>
  );
}

export { WorkspaceUserIdentity, getUserDisplayName };
