import { Outlet, useParams } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { useGetWorkspaceByIdQuery } from '@/features/workspace/api/workspace-api';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';

function WorkspaceAccessState({ error, onRetry }) {
  const status = error?.status;

  if (status === 403) {
    return (
      <section className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-semibold">Accès refusé</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte n’est pas autorisé à consulter cet espace de travail.
          </p>
        </div>
      </section>
    );
  }

  if (status === 404) {
    return (
      <section className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-semibold">Espace introuvable</h1>
          <p className="text-sm text-muted-foreground">
            Cet espace de travail n’existe pas ou n’est plus disponible.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="max-w-md space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Espace indisponible</h1>
          <p className="text-sm text-muted-foreground">
            Le contexte de cet espace de travail n’a pas pu être chargé.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      </div>
    </section>
  );
}

function WorkspaceGuard() {
  const { workspaceId } = useParams();
  const {
    data: workspace,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetWorkspaceByIdQuery(workspaceId, {
    skip: !workspaceId,
  });

  if (!workspaceId || isLoading || (isFetching && !workspace)) {
    return <PageLoader />;
  }

  if (error || !workspace) {
    return <WorkspaceAccessState error={error} onRetry={refetch} />;
  }

  return (
    <WorkspaceProvider workspace={workspace}>
      <Outlet />
    </WorkspaceProvider>
  );
}

export { WorkspaceGuard };
