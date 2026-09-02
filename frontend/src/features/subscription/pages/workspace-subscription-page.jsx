import { Button } from '@/components/ui/button';
import { PlanCard } from '@/features/plan/components/plan-card';
import { useListPublicPlansQuery } from '@/features/plan/api/plan-api';
import { useGetWorkspaceSubscriptionQuery } from '@/features/subscription/api/subscription-api';
import { SubscriptionSummaryCard } from '@/features/subscription/components/subscription-summary-card';
import { TrialProgress } from '@/features/subscription/components/trial-progress';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function WorkspaceSubscriptionPage() {
  const { workspace, membership } = useWorkspaceContext();
  const subscriptionQuery = useGetWorkspaceSubscriptionQuery(workspace.id);
  const plansQuery = useListPublicPlansQuery();

  if (subscriptionQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de l’abonnement…</p>;
  }

  if (subscriptionQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Abonnement</h1>
        <p className="text-sm text-destructive">Impossible de charger l’abonnement du workspace.</p>
        <Button type="button" variant="outline" onClick={subscriptionQuery.refetch}>Réessayer</Button>
      </section>
    );
  }

  const subscription = subscriptionQuery.data;
  const commercial = subscription?.commercial;
  const entitlement = subscription?.effectiveEntitlement;

  /*
   * Le statut persistant `trialing` ne suffit pas. Un trial expiré peut rester
   * temporairement stocké comme tel alors que l'entitlement serveur a déjà
   * basculé vers la baseline Free.
   */
  const trialIsEffective = Boolean(
    commercial?.status === 'trialing'
    && entitlement?.subscriptionKind === 'commercial'
    && entitlement?.subscriptionStatus === 'trialing',
  );
  const isOwner = membership?.role?.key === 'owner';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abonnement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez le plan, le trial et les droits commerciaux effectifs de {workspace.name}.
        </p>
      </div>

      <SubscriptionSummaryCard subscription={subscription} />

      <TrialProgress
        active={trialIsEffective}
        startAt={commercial?.currentPeriodStart}
        endAt={commercial?.trialEndsAt}
      />

      <section className="space-y-4" aria-labelledby="plan-catalog-title">
        <div>
          <h2 id="plan-catalog-title" className="text-xl font-semibold">Offres disponibles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les tarifs ci-dessous proviennent du catalogue public. Les actions de changement de plan seront ajoutées dans le lot suivant.
          </p>
          {!isOwner && (
            <p className="mt-2 text-sm text-muted-foreground">
              Votre rôle permet la consultation de l’abonnement, mais seul le propriétaire peut modifier le contrat commercial.
            </p>
          )}
        </div>

        {plansQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Chargement des offres…</p>
        )}

        {plansQuery.error && (
          <div className="space-y-2 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-destructive">Impossible de charger le catalogue des plans.</p>
            <Button type="button" variant="outline" onClick={plansQuery.refetch}>Réessayer</Button>
          </div>
        )}

        {!plansQuery.isLoading && !plansQuery.error && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(plansQuery.data ?? []).map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export { WorkspaceSubscriptionPage };
