import { Link, Navigate } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import {
  PLATFORM_HOME,
  isPlatformSuperAdmin,
} from '@/features/auth/lib/authenticated-destination';
import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';
import { resolveWorkspaceContext } from '@/features/workspace/lib/resolve-workspace-context';

function WorkspaceEntryPage() {
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    isFetching: isCurrentUserFetching,
  } = useGetCurrentUserQuery();
  const {
    data: workspaces = [],
    isLoading,
    isError,
    refetch,
  } = useListWorkspacesQuery(undefined, {
    skip: isPlatformSuperAdmin(currentUser),
  });

  if (
    isCurrentUserLoading
    || (isCurrentUserFetching && !currentUser)
    || isLoading
  ) {
    return <PageLoader />;
  }

  if (isPlatformSuperAdmin(currentUser)) {
    return <Navigate to={PLATFORM_HOME} replace />;
  }

  if (isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
        <section className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Impossible de charger vos espaces</h1>
            <p className="text-sm text-muted-foreground">
              Vérifiez votre connexion puis réessayez.
            </p>
          </div>
          <Button type="button" onClick={() => refetch()}>Réessayer</Button>
        </section>
      </main>
    );
  }

  const resolution = resolveWorkspaceContext(workspaces);

  if (resolution.type === 'onboarding') {
    return <Navigate to="/onboarding/workspace" replace />;
  }

  if (resolution.type === 'workspace') {
    return (
      <Navigate
        to={`/workspaces/${resolution.workspaceId}/dashboard`}
        replace
      />
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">SaaS Core</p>
          <h1 className="text-2xl font-semibold tracking-tight">Choisissez un espace</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte appartient à plusieurs espaces de travail. Choisissez celui que vous souhaitez ouvrir.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {resolution.workspaces.map((workspace) => (
            <article
              key={workspace.id}
              className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground"
            >
              <div className="space-y-1">
                <h2 className="font-semibold">{workspace.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Rôle : {workspace.membership?.role?.name ?? workspace.membership?.role?.key ?? 'Membre'}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to={`/workspaces/${workspace.id}/dashboard`}>Ouvrir cet espace</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export { WorkspaceEntryPage };
