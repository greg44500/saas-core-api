import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { InlineIconLink } from '@/components/shared/inline-icon-link';
import { Button } from '@/components/ui/button';
import {
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideCapability,
  formatPlatformEntitlementOverrideDate,
  formatPlatformEntitlementOverrideLifecycle,
  formatPlatformEntitlementOverrideSource,
  formatPlatformEntitlementOverrideValue,
  isEditablePlatformEntitlementOverride,
} from '@/features/platform/lib/platform-entitlement-override-formatters';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

function formatActor(actor) {
  if (!actor) return '—';
  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return fullName || actor.email || actor.id || '—';
}

function getTargetLabel(targetType) {
  if (targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) return 'Fonctionnalité';
  if (targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) return 'Limite';
  return 'Cible';
}

function getValueLabel(targetType) {
  return targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
    ? 'Action appliquée'
    : 'Valeur appliquée';
}

function PlatformEntitlementOverrideDetails({
  error,
  isLoading,
  onEdit,
  onRetry,
  onRevoke,
  onViewWorkspace,
  override,
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de la dérogation…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger cette dérogation.
        </p>
        <Button onClick={onRetry} type="button" variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  if (!override) return null;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Dérogation
        </h3>
        <dl className="mt-2">
          <DetailRow
            label="Workspace"
            value={(
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 break-words">
                  {override.workspace?.name ?? override.workspace?.id ?? '—'}
                </span>
                {onViewWorkspace && override.workspace?.id && (
                  <InlineIconLink
                    label="Voir le workspace"
                    onClick={() => onViewWorkspace(override.workspace)}
                  />
                )}
              </div>
            )}
          />
          <DetailRow
            label={getTargetLabel(override.targetType)}
            value={formatPlatformEntitlementOverrideCapability(override)}
          />
          <DetailRow
            label={getValueLabel(override.targetType)}
            value={formatPlatformEntitlementOverrideValue(override)}
          />
          <DetailRow
            label="Statut de la dérogation"
            value={formatPlatformEntitlementOverrideLifecycle(override.lifecycle)}
          />
          <DetailRow label="Origine" value={formatPlatformEntitlementOverrideSource(override.source)} />
          <DetailRow label="Début" value={formatPlatformEntitlementOverrideDate(override.startsAt)} />
          <DetailRow label="Fin" value={override.endsAt ? formatPlatformEntitlementOverrideDate(override.endsAt) : 'Permanente'} />
          <DetailRow label="Motif" value={override.reason} />
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Traçabilité
        </h3>
        <dl className="mt-2">
          <DetailRow label="Accordée par" value={formatActor(override.grantedBy)} />
          <DetailRow label="Dernière modification" value={formatActor(override.updatedBy)} />
          <DetailRow label="Créée le" value={formatPlatformEntitlementOverrideDate(override.createdAt)} />
          <DetailRow label="Mise à jour le" value={formatPlatformEntitlementOverrideDate(override.updatedAt)} />
          {override.revokedAt && (
            <>
              <DetailRow label="Révoquée le" value={formatPlatformEntitlementOverrideDate(override.revokedAt)} />
              <DetailRow label="Révoquée par" value={formatActor(override.revokedBy)} />
              <DetailRow label="Motif de révocation" value={override.revokeReason} />
            </>
          )}
        </dl>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h3 className="font-semibold">Actions d’administration</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Toute modification ou révocation est revalidée et auditée par le backend.
          </p>
        </div>

        {isEditablePlatformEntitlementOverride(override) ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onEdit(override)} type="button" variant="secondary">
              Modifier
            </Button>
            <Button onClick={() => onRevoke(override)} type="button" variant="destructive">
              Révoquer
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cette dérogation est historique et ne peut plus être modifiée.
          </p>
        )}
      </section>
    </div>
  );
}

function PlatformEntitlementOverrideDetailsDrawer({
  error,
  isLoading,
  onClose,
  onEdit,
  onRetry,
  onRevoke,
  onViewWorkspace,
  open,
  override,
}) {
  return (
    <EntityDetailsDrawer
      description="Dérogation commerciale appliquée au calcul d’entitlement du workspace. Les informations internes restent réservées à Platform."
      onClose={onClose}
      open={open}
      title={override?.workspace?.name ?? 'Détails de la dérogation'}
    >
      <PlatformEntitlementOverrideDetails
        error={error}
        isLoading={isLoading}
        onEdit={onEdit}
        onRetry={onRetry}
        onRevoke={onRevoke}
        onViewWorkspace={onViewWorkspace}
        override={override}
      />
    </EntityDetailsDrawer>
  );
}

export {
  PlatformEntitlementOverrideDetails,
  PlatformEntitlementOverrideDetailsDrawer,
  getTargetLabel,
  getValueLabel,
};
