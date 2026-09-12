import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { EntityDetailsSkeleton } from '@/components/shared/entity-details-skeleton';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_WORKSPACE_STATUS,
  formatPlatformWorkspaceDate,
  formatPlatformWorkspaceStatus,
  formatPlatformWorkspaceStatusReason,
} from '@/features/platform/lib/platform-workspace-formatters';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

function ActorValue({ actor }) {
  if (!actor) return '—';

  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ');
  const isResolved = Boolean(fullName || actor.email);

  return (
    <div className="space-y-0.5">
      <p>{isResolved ? fullName || actor.email : 'Utilisateur indisponible'}</p>
      {fullName && actor.email && (
        <p className="text-xs text-muted-foreground">{actor.email}</p>
      )}
    </div>
  );
}

function PlatformWorkspaceDetailsDrawer({
  canAuthorizeOwnershipTransfer = false,
  error,
  isLoading,
  onClose,
  onRequestAction,
  onRetry,
  open,
  ownershipAuthorization,
  ownershipAuthorizationLoading = false,
  workspace,
}) {
  const isInitialLoading = isLoading && !workspace;
  const canManageOwnershipAuthorization = canAuthorizeOwnershipTransfer
    && workspace?.status === PLATFORM_WORKSPACE_STATUS.ACTIVE;

  return (
    <EntityDetailsDrawer
      description="État administratif et informations de cycle de vie exposés par l’administration Platform."
      onClose={onClose}
      open={open}
      title={workspace?.name ?? 'Détails du workspace'}
    >
      {isInitialLoading && (
        <EntityDetailsSkeleton
          label="Chargement des détails du workspace…"
          rowsPerSection={10}
          sections={1}
        />
      )}

      {!workspace && !isInitialLoading && error && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger les détails de ce workspace.
          </p>
          <Button onClick={onRetry} type="button" variant="outline">
            Réessayer
          </Button>
        </div>
      )}

      {workspace && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace
            </h3>
            <dl className="mt-2">
              <DetailRow label="Nom" value={workspace.name} />
              <DetailRow label="Statut" value={formatPlatformWorkspaceStatus(workspace.status)} />
              <DetailRow label="Motif" value={formatPlatformWorkspaceStatusReason(workspace.statusReason)} />
              <DetailRow label="Détails du motif" value={workspace.statusReasonDetails ?? '—'} />
              <DetailRow label="Statut modifié le" value={formatPlatformWorkspaceDate(workspace.statusChangedAt)} />
              <DetailRow label="Statut modifié par" value={<ActorValue actor={workspace.statusChangedBy} />} />
              <DetailRow label="Créé par" value={<ActorValue actor={workspace.createdBy} />} />
              <DetailRow label="Mis à jour par" value={<ActorValue actor={workspace.updatedBy} />} />
              <DetailRow label="Créé le" value={formatPlatformWorkspaceDate(workspace.createdAt)} />
              <DetailRow label="Mis à jour le" value={formatPlatformWorkspaceDate(workspace.updatedAt)} />
            </dl>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <h3 className="font-semibold">Actions d’administration</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les transitions autorisées restent contrôlées et auditées.
              </p>
            </div>

            {workspace.status === PLATFORM_WORKSPACE_STATUS.ACTIVE && (
              <Button
                onClick={() => onRequestAction({ type: 'suspend', workspace })}
                type="button"
                variant="destructive"
              >
                Suspendre
              </Button>
            )}

            {workspace.status === PLATFORM_WORKSPACE_STATUS.SUSPENDED && (
              <Button
                onClick={() => onRequestAction({ type: 'reactivate', workspace })}
                type="button"
              >
                Réactiver
              </Button>
            )}

            {workspace.status !== PLATFORM_WORKSPACE_STATUS.ACTIVE
              && workspace.status !== PLATFORM_WORKSPACE_STATUS.SUSPENDED && (
                <p className="text-sm text-muted-foreground">
                  Aucune transition Plateforme n’est exposée par l’API pour ce statut.
                </p>
              )}
          </section>

          {canManageOwnershipAuthorization && (
            <section className="space-y-3 rounded-xl border border-destructive/30 bg-card p-4">
              <div>
                <p className="text-sm font-medium text-destructive">Capacité opérationnelle exceptionnelle</p>
                <h3 className="mt-1 font-semibold">Transfert de propriété</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cette action ne transfère pas le workspace. Elle ouvre temporairement et pour un seul transfert le workflow réservé au propriétaire courant, qui devra confirmer lui-même son mot de passe et les conséquences de l’opération.
                </p>
              </div>

              {ownershipAuthorizationLoading ? (
                <p className="text-sm text-muted-foreground">Vérification de l’autorisation…</p>
              ) : ownershipAuthorization?.active ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    Autorisation active jusqu’au{' '}
                    <span className="font-medium">
                      {formatPlatformWorkspaceDate(ownershipAuthorization.expiresAt)}
                    </span>.
                  </p>
                  <Button
                    onClick={() => onRequestAction({
                      type: 'revoke-ownership-transfer',
                      workspace,
                    })}
                    type="button"
                    variant="destructive"
                  >
                    Révoquer l’autorisation de transfert
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => onRequestAction({
                    type: 'authorize-ownership-transfer',
                    workspace,
                  })}
                  type="button"
                  variant="outline"
                >
                  Autoriser temporairement le transfert
                </Button>
              )}
            </section>
          )}
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformWorkspaceDetailsDrawer };
