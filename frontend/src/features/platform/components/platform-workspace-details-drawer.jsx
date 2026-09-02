import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
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

function PlatformWorkspaceDetailsDrawer({
  error,
  isLoading,
  onClose,
  onRequestAction,
  onRetry,
  open,
  workspace,
}) {
  return (
    <EntityDetailsDrawer
      description="État administratif et informations de cycle de vie exposés par l’administration Platform."
      onClose={onClose}
      open={open}
      title={workspace?.name ?? 'Détails du workspace'}
    >
      {isLoading && <p className="text-sm text-muted-foreground">Chargement des détails…</p>}

      {!isLoading && error && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger les détails de ce workspace.
          </p>
          <Button onClick={onRetry} type="button" variant="outline">
            Réessayer
          </Button>
        </div>
      )}

      {!isLoading && !error && workspace && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace
            </h3>
            <dl className="mt-2">
              <DetailRow label="Nom" value={workspace.name} />
              <DetailRow label="Identifiant" value={workspace.id} />
              <DetailRow label="Statut" value={formatPlatformWorkspaceStatus(workspace.status)} />
              <DetailRow label="Motif" value={formatPlatformWorkspaceStatusReason(workspace.statusReason)} />
              <DetailRow label="Détails du motif" value={workspace.statusReasonDetails ?? '—'} />
              <DetailRow label="Statut modifié le" value={formatPlatformWorkspaceDate(workspace.statusChangedAt)} />
              <DetailRow label="Statut modifié par" value={workspace.statusChangedBy ?? '—'} />
              <DetailRow label="Créé par" value={workspace.createdBy ?? '—'} />
              <DetailRow label="Mis à jour par" value={workspace.updatedBy ?? '—'} />
              <DetailRow label="Créé le" value={formatPlatformWorkspaceDate(workspace.createdAt)} />
              <DetailRow label="Mis à jour le" value={formatPlatformWorkspaceDate(workspace.updatedAt)} />
            </dl>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <h3 className="font-semibold">Actions d’administration</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les transitions autorisées restent contrôlées et auditées par le backend.
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
                  Aucune transition Platform n’est exposée par l’API pour ce statut.
                </p>
              )}
          </section>
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformWorkspaceDetailsDrawer };
