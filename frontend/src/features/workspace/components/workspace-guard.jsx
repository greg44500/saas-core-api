import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { useGetWorkspaceByIdQuery } from '@/features/workspace/api/workspace-api';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import {
  getWorkspaceRouteRequiredFeature,
} from '@/features/workspace/lib/workspace-route-entitlement';
import { useEntitlementAutoRefresh } from '@/hooks/use-entitlement-auto-refresh';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: workspaceContext,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetWorkspaceByIdQuery(workspaceId, {
    skip: !workspaceId,
  });

  useEntitlementAutoRefresh({
    data: workspaceContext,
    nextChangeAt: workspaceContext?.nextEntitlementChangeAt,
    refetch,
    selectSnapshot: (data) => [
      ...(data?.features ?? []),
    ].sort(),
    onChanged: ({ data, reason }) => {
      const requiredFeature = getWorkspaceRouteRequiredFeature({
        pathname: location.pathname,
        workspaceId,
      });
      const effectiveFeatures = new Set(data?.features ?? []);
      const currentRouteBecameUnavailable = Boolean(
        requiredFeature && !effectiveFeatures.has(requiredFeature),
      );

      if (currentRouteBecameUnavailable) {
        navigate(`/workspaces/${workspaceId}/dashboard`, {
          replace: true,
        });
      }

      toast({
        title: currentRouteBecameUnavailable
          ? 'Accès au workspace mis à jour'
          : 'Droits du workspace actualisés',
        description: currentRouteBecameUnavailable
          ? 'Une dérogation a pris fin ou les droits ont changé. Vous avez été redirigé vers le tableau de bord.'
          : reason === 'schedule'
            ? 'Une dérogation commerciale a pris effet ou a expiré. L’interface a été mise à jour sans reconnexion.'
            : 'Les fonctionnalités disponibles ont été resynchronisées.',
        variant: 'info',
      });
    },
  });

  if (!workspaceId || isLoading || (isFetching && !workspaceContext)) {
    return <PageLoader />;
  }

  if (error || !workspaceContext?.workspace) {
    return <WorkspaceAccessState error={error} onRetry={refetch} />;
  }

  return (
    <WorkspaceProvider
      features={workspaceContext.features}
      membership={workspaceContext.membership}
      permissions={workspaceContext.permissions}
      workspace={workspaceContext.workspace}
    >
      <Outlet />
    </WorkspaceProvider>
  );
}

export { WorkspaceAccessState, WorkspaceGuard };
