import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import {
  formatPlatformSubscriptionBillingInterval,
  formatPlatformSubscriptionDate,
  formatPlatformSubscriptionDiscountType,
  formatPlatformSubscriptionKind,
  formatPlatformSubscriptionPrice,
  formatPlatformSubscriptionStatus,
} from '@/features/platform/lib/platform-subscription-formatters';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

function PlatformSubscriptionDetailsDrawer({
  error,
  isLoading,
  onCancel,
  onClose,
  onEdit,
  onResume,
  onRetry,
  open,
  subscription,
}) {
  return (
    <EntityDetailsDrawer
      description="Données contractuelles et état administratif de la souscription."
      onClose={onClose}
      open={open}
      title={subscription?.workspace?.name ?? 'Détails de la souscription'}
    >
      {isLoading && <p className="text-sm text-muted-foreground">Chargement des détails…</p>}
      {!isLoading && error && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">Impossible de charger la souscription.</p>
          <Button onClick={onRetry} type="button" variant="outline">Réessayer</Button>
        </div>
      )}
      {!isLoading && !error && subscription && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Souscription</h3>
            <dl className="mt-2">
              <DetailRow label="Workspace" value={subscription.workspace?.name} />
              <DetailRow label="Plan" value={subscription.plan?.name} />
              <DetailRow label="Type" value={formatPlatformSubscriptionKind(subscription.kind)} />
              <DetailRow label="Statut" value={formatPlatformSubscriptionStatus(subscription.status)} />
              <DetailRow label="Périodicité" value={formatPlatformSubscriptionBillingInterval(subscription.billingInterval)} />
              <DetailRow label="Prix HT" value={formatPlatformSubscriptionPrice(subscription.priceExclTaxMinor, subscription.currency)} />
              <DetailRow label="Début de période" value={formatPlatformSubscriptionDate(subscription.currentPeriodStart)} />
              <DetailRow label="Fin de période" value={formatPlatformSubscriptionDate(subscription.currentPeriodEnd)} />
              <DetailRow label="Fin du trial" value={formatPlatformSubscriptionDate(subscription.trialEndsAt)} />
              <DetailRow label="Annulation programmée" value={subscription.cancelAtPeriodEnd ? 'Oui' : 'Non'} />
              <DetailRow label="Remise" value={formatPlatformSubscriptionDiscountType(subscription.discountType)} />
              <DetailRow label="Dérogation manuelle" value={subscription.manualOverride ? 'Oui' : 'Non'} />
            </dl>
          </section>

          {subscription.scheduledChange && (
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">Changement programmé</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {subscription.scheduledChange.targetPlan?.name ?? 'Plan cible'} — effet le {formatPlatformSubscriptionDate(subscription.scheduledChange.effectiveAt)}
              </p>
            </section>
          )}

          <section className="flex flex-wrap gap-2">
            <Button onClick={() => onEdit(subscription)} type="button" variant="outline">Modifier</Button>
            {subscription.cancelAtPeriodEnd ? (
              <Button onClick={() => onResume(subscription)} type="button">Reprendre</Button>
            ) : subscription.status === 'active' ? (
              <Button onClick={() => onCancel(subscription)} type="button" variant="destructive">Annuler</Button>
            ) : null}
          </section>
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformSubscriptionDetailsDrawer };
