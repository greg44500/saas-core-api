import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import {
  formatPlatformUserDate,
  formatPlatformUserName,
  formatPlatformUserStatus,
} from '@/features/platform/lib/platform-user-formatters';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

function PlatformUserDetailsDrawer({
  currentUserId,
  error,
  isLoading,
  onClose,
  onRequestAction,
  onRetry,
  open,
  user,
}) {
  const isSelf = Boolean(user?.id && user.id === currentUserId);
  const title = user ? formatPlatformUserName(user) : 'Détails utilisateur';

  return (
    <EntityDetailsDrawer
      description="Identité, état du compte et informations de sécurité exposées par l’administration Platform."
      onClose={onClose}
      open={open}
      title={title}
    >
      {isLoading && (
        <p className="text-sm text-muted-foreground">Chargement des détails…</p>
      )}

      {!isLoading && error && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger les détails de cet utilisateur.
          </p>
          <Button onClick={onRetry} type="button" variant="outline">
            Réessayer
          </Button>
        </div>
      )}

      {!isLoading && !error && user && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Compte
            </h3>
            <dl className="mt-2">
              <DetailRow label="Nom" value={formatPlatformUserName(user)} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Statut" value={formatPlatformUserStatus(user.status)} />
              <DetailRow label="Email vérifié" value={formatPlatformUserDate(user.emailVerifiedAt)} />
              <DetailRow label="Dernière connexion" value={formatPlatformUserDate(user.lastLoginAt)} />
              <DetailRow label="Créé le" value={formatPlatformUserDate(user.createdAt)} />
              <DetailRow label="Mis à jour le" value={formatPlatformUserDate(user.updatedAt)} />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sécurité et cycle de vie
            </h3>
            <dl className="mt-2">
              <DetailRow label="Mot de passe modifié" value={formatPlatformUserDate(user.passwordChangedAt)} />
              <DetailRow label="Désactivé le" value={formatPlatformUserDate(user.disabledAt)} />
              <DetailRow label="Motif de désactivation" value={user.disabledReason ?? '—'} />
              <DetailRow label="Clôture demandée le" value={formatPlatformUserDate(user.deletionRequestedAt)} />
              <DetailRow label="Clôturé le" value={formatPlatformUserDate(user.closedAt)} />
              <DetailRow label="Motif de clôture" value={user.closureReason ?? '—'} />
            </dl>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <h3 className="font-semibold">Actions d’administration</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Le cycle de vie du compte est distinct de l’appartenance et du rôle dans l’Équipe de la Plateforme.
              </p>
            </div>

            {isSelf ? (
              <p className="text-sm text-muted-foreground">
                Les actions sensibles sur votre propre compte sont masquées ici pour éviter une perte d’accès accidentelle.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.status === 'active' && (
                  <Button
                    onClick={() => onRequestAction({ type: 'disable', user })}
                    type="button"
                    variant="destructive"
                  >
                    Désactiver
                  </Button>
                )}

                {user.status === 'disabled' && (
                  <Button
                    onClick={() => onRequestAction({ type: 'enable', user })}
                    type="button"
                  >
                    Réactiver
                  </Button>
                )}

                <Button
                  onClick={() => onRequestAction({ type: 'revoke-sessions', user })}
                  type="button"
                  variant="outline"
                >
                  Révoquer les sessions
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformUserDetailsDrawer };
