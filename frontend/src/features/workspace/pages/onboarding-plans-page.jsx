import { Link, Navigate, useParams } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { PlanCard } from '@/features/plan/components/plan-card';
import { useListPublicPlansQuery } from '@/features/plan/api/plan-api';
import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';

function OnboardingPlansPage() {
  const { workspaceId } = useParams();
  const {
    data: workspaces = [],
    isLoading: isLoadingWorkspaces,
    isError: isWorkspaceError,
  } = useListWorkspacesQuery();
  const {
    data: plans = [],
    isLoading: isLoadingPlans,
    isError: isPlanError,
    refetch: refetchPlans,
  } = useListPublicPlansQuery();

  if (isLoadingWorkspaces || isLoadingPlans) {
    return <PageLoader />;
  }

  if (isWorkspaceError) {
    return <Navigate to="/workspaces" replace />;
  }

  const workspace = workspaces.find((item) => item.id === workspaceId);

  if (!workspace) {
    return <Navigate to="/workspaces" replace />;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Choix facultatif</p>
        <h1 className="text-2xl font-semibold tracking-tight">Comparer les plans</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.name} dispose déjà du plan Free. Vous pouvez consulter le catalogue maintenant ou continuer directement vers votre espace.
        </p>
      </div>

      {isPlanError ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <h2 className="font-semibold">Catalogue indisponible</h2>
            <p className="text-sm text-muted-foreground">
              Votre workspace reste utilisable avec le plan Free. Vous pourrez comparer les offres plus tard.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={refetchPlans}>Réessayer</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild>
          <Link to={`/workspaces/${workspace.id}/dashboard`}>Continuer avec Free</Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Aucun trial ni changement de plan n’est déclenché depuis cet écran. Ces actions resteront explicites dans la gestion de l’abonnement.
      </p>
    </section>
  );
}

export { OnboardingPlansPage };
