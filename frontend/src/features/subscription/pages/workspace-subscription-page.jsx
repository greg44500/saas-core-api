import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useListPublicPlansQuery } from '@/features/plan/api/plan-api';
import { PlanCard } from '@/features/plan/components/plan-card';
import {
  useEndWorkspaceTrialToFreeMutation,
  useGetWorkspaceSubscriptionQuery,
  useStartOrChangeWorkspaceTrialMutation,
} from '@/features/subscription/api/subscription-api';
import { CommercialLifecycleSection } from '@/features/subscription/components/commercial-lifecycle-section';
import { EffectivePlanCapabilities } from '@/features/subscription/components/effective-plan-capabilities';
import { EndTrialToFreeDialog } from '@/features/subscription/components/end-trial-to-free-dialog';
import { SubscriptionSummaryCard } from '@/features/subscription/components/subscription-summary-card';
import { TrialProgress } from '@/features/subscription/components/trial-progress';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function WorkspaceSubscriptionPage() {
  const { workspace, membership } = useWorkspaceContext();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [feedback, setFeedback] = useState(null);
  const [endTrialDialogOpen, setEndTrialDialogOpen] = useState(false);

  const subscriptionQuery = useGetWorkspaceSubscriptionQuery(workspace.id);
  const plansQuery = useListPublicPlansQuery();
  const [startOrChangeTrial, trialMutation] = useStartOrChangeWorkspaceTrialMutation();
  const [endTrialToFree, endTrialMutation] = useEndWorkspaceTrialToFreeMutation();

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
  const trialConsumed = subscription?.trialEligibility?.consumed === true;

  /*
   * Le statut persistant `trialing` ne suffit pas. Un essai expiré peut rester
   * temporairement stocké comme tel alors que l'entitlement serveur a déjà
   * basculé vers la baseline Free.
   */
  const trialIsEffective = Boolean(
    commercial?.status === 'trialing'
    && entitlement?.subscriptionKind === 'commercial'
    && entitlement?.subscriptionStatus === 'trialing',
  );
  const hasCurrentCommercialContract = ['active', 'past_due'].includes(commercial?.status);
  const isOwner = membership?.role?.key === 'owner';
  const mutationPending = trialMutation.isLoading || endTrialMutation.isLoading;
  const ownerCanChooseTrialInterval = isOwner && (
    trialIsEffective || (!trialConsumed && !hasCurrentCommercialContract)
  );

  async function handleTrialPlan(plan) {
    setFeedback(null);

    try {
      await startOrChangeTrial({
        workspaceId: workspace.id,
        planId: plan.id,
        billingInterval,
      }).unwrap();

      setFeedback({
        type: 'success',
        message: trialIsEffective
          ? `La période d’essai utilise maintenant le plan ${plan.name}. Sa date de fin reste inchangée.`
          : `La période d’essai du plan ${plan.name} a démarré.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiMessage(error, 'La période d’essai n’a pas pu être modifiée.'),
      });
    }
  }

  async function handleEndTrialToFree() {
    setFeedback(null);

    try {
      await endTrialToFree({ workspaceId: workspace.id }).unwrap();
      setEndTrialDialogOpen(false);
      setFeedback({
        type: 'success',
        message: 'La période d’essai est terminée. Le plan Free est de nouveau effectif.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiMessage(error, 'Le retour vers le plan Free a échoué.'),
      });
    }
  }

  function renderPlanAction(plan) {
    if (!isOwner) return null;

    if (plan.key === 'free') {
      if (trialIsEffective) {
        return (
          <Button
            disabled={mutationPending}
            onClick={() => setEndTrialDialogOpen(true)}
            type="button"
            variant="outline"
          >
            Revenir au plan Free
          </Button>
        );
      }

      if (entitlement?.plan?.id === plan.id) {
        return <p className="text-sm font-medium text-muted-foreground">Plan actuel</p>;
      }

      return null;
    }

    const trialAvailable = plan.trialEnabled === true
      && Number.isInteger(plan.trialDurationDays)
      && plan.trialDurationDays > 0;

    if (trialIsEffective && commercial?.plan?.id === plan.id) {
      return <p className="text-sm font-medium text-primary">Essai en cours</p>;
    }

    if (!trialAvailable) {
      return <p className="text-sm text-muted-foreground">Aucun essai disponible</p>;
    }

    if (hasCurrentCommercialContract) {
      return <p className="text-sm text-muted-foreground">Abonnement commercial en cours</p>;
    }

    if (!trialIsEffective && trialConsumed) {
      return <p className="text-sm text-muted-foreground">Essai déjà utilisé</p>;
    }

    return (
      <div className="space-y-2">
        <Button
          disabled={mutationPending}
          onClick={() => handleTrialPlan(plan)}
          type="button"
        >
          {trialIsEffective
            ? 'Tester ce plan pendant l’essai'
            : `Démarrer l’essai de ${plan.trialDurationDays} jours`}
        </Button>
        {trialIsEffective && (
          <p className="text-xs text-muted-foreground">
            Changer de plan ne prolonge pas la date de fin de l’essai.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abonnement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez le plan, la période d’essai et les droits commerciaux effectifs de {workspace.name}.
        </p>
      </div>

      {feedback && (
        <p
          className={`rounded-md border p-3 text-sm ${
            feedback.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-success/30 bg-success/10'
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      <SubscriptionSummaryCard subscription={subscription} />

      <EffectivePlanCapabilities plan={entitlement?.plan} />

      <TrialProgress
        active={trialIsEffective}
        startAt={commercial?.currentPeriodStart}
        endAt={commercial?.trialEndsAt}
      />

      <CommercialLifecycleSection
        commercial={commercial}
        isOwner={isOwner}
        onFeedback={setFeedback}
        plans={plansQuery.data ?? []}
        workspaceId={workspace.id}
      />

      <section className="space-y-4" aria-labelledby="plan-catalog-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="plan-catalog-title" className="text-xl font-semibold">Offres disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les tarifs et conditions d’essai ci-dessous proviennent du catalogue public.
            </p>
            {!isOwner && (
              <p className="mt-2 text-sm text-muted-foreground">
                Votre rôle permet la consultation de l’abonnement, mais seul le propriétaire peut modifier le contrat commercial.
              </p>
            )}
            {isOwner && !trialIsEffective && trialConsumed && (
              <p className="mt-2 text-sm text-muted-foreground">
                L’essai gratuit a déjà été consommé pour cette identité.
              </p>
            )}
          </div>

          {ownerCanChooseTrialInterval && (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="trial-billing-interval">
                Périodicité de référence
              </label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={mutationPending}
                id="trial-billing-interval"
                onChange={(event) => setBillingInterval(event.target.value)}
                value={billingInterval}
              >
                <option value="monthly">Mensuelle</option>
                <option value="yearly">Annuelle</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Aucun moyen de paiement n’est demandé pendant l’essai.
              </p>
            </div>
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
              <PlanCard key={plan.id} plan={plan}>
                {renderPlanAction(plan)}
              </PlanCard>
            ))}
          </div>
        )}
      </section>

      <EndTrialToFreeDialog
        onCancel={() => setEndTrialDialogOpen(false)}
        onConfirm={handleEndTrialToFree}
        open={endTrialDialogOpen}
        pending={endTrialMutation.isLoading}
      />
    </div>
  );
}

export { WorkspaceSubscriptionPage, getApiMessage };
