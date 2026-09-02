import {
  formatAccessMode,
  formatLimitLabel,
  formatSubscriptionDate,
  formatSubscriptionStatus,
} from '@/features/subscription/lib/subscription-formatters';

/**
 * Présente l'état consolidé fourni par le backend sans reconstruire le plan
 * effectif à partir des subscriptions baseline/commercial séparées.
 */
function SubscriptionSummaryCard({ subscription }) {
  const entitlement = subscription?.effectiveEntitlement;
  const commercial = subscription?.commercial;
  const effectivePlan = entitlement?.plan;

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="subscription-summary-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan effectif</p>
          <h2 id="subscription-summary-title" className="mt-1 text-xl font-semibold">
            {effectivePlan?.name ?? 'Plan indisponible'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatSubscriptionStatus(entitlement?.subscriptionStatus)} · {formatAccessMode(entitlement?.accessMode)}
          </p>
        </div>

        <div className="text-right text-sm">
          <p className="text-muted-foreground">Source des droits</p>
          <p className="font-medium capitalize">{entitlement?.subscriptionKind ?? '—'}</p>
        </div>
      </div>

      {entitlement?.accessMode === 'remediation' && (
        <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="font-medium text-destructive">Mise en conformité requise</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {entitlement.reason ?? 'La consommation actuelle dépasse une limite bloquante du plan effectif.'}
          </p>
          {(entitlement.blockingLimits ?? []).length > 0 && (
            <p className="mt-2 text-sm">
              Limites concernées : {(entitlement.blockingLimits ?? []).map(formatLimitLabel).join(', ')}.
            </p>
          )}
        </div>
      )}

      {commercial && (
        <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Offre commerciale</p>
            <p className="mt-1 font-medium">{commercial.plan?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <p className="mt-1 font-medium">{formatSubscriptionStatus(commercial.status)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Période en cours</p>
            <p className="mt-1 font-medium">{formatSubscriptionDate(commercial.currentPeriodEnd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Facturation</p>
            <p className="mt-1 font-medium capitalize">{commercial.billingInterval ?? '—'}</p>
          </div>
        </div>
      )}

      {commercial?.cancelAtPeriodEnd && (
        <p className="mt-4 rounded-md border border-border bg-muted/50 p-3 text-sm">
          Une résiliation est programmée à la fin de la période en cours.
        </p>
      )}

      {commercial?.scheduledChange?.type === 'downgrade' && (
        <p className="mt-4 rounded-md border border-border bg-muted/50 p-3 text-sm">
          Downgrade programmé vers {commercial.scheduledChange.targetPlan?.name ?? 'un autre plan'} le{' '}
          {formatSubscriptionDate(commercial.scheduledChange.effectiveAt)}.
        </p>
      )}
    </section>
  );
}

export { SubscriptionSummaryCard };
