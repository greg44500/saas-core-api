import { Pause, Pencil, Play, UserMinus } from 'lucide-react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import { PlatformFounderBadge } from '@/features/platform/components/platform-founder-badge';
import {
  formatPlatformTeamMemberName,
} from '@/features/platform/components/platform-team-member-read-columns';
import {
  PlatformTeamMemberStatusBadge,
} from '@/features/platform/components/platform-team-member-status-badge';
import {
  formatPlatformUserDate,
  formatPlatformUserStatus,
} from '@/features/platform/lib/platform-user-formatters';

function DetailRow({ label, value }) {
  const displayValue = value === null || value === undefined || value === ''
    ? '—'
    : value;

  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">
        {displayValue}
      </dd>
    </div>
  );
}

function PlatformTeamMemberDetailsDrawer({
  actionCapabilities = {},
  currentUserId,
  member,
  onClose,
  onRequestAction,
  open,
}) {
  const isCurrentUser = Boolean(
    member?.user?.id
    && member.user.id === currentUserId,
  );
  const memberName = member
    ? formatPlatformTeamMemberName(member)
    : 'Détails du membre';
  const title = isCurrentUser
    ? `${memberName} (vous)`
    : memberName;
  const {
    canChangeRole = false,
    canReactivate = false,
    canRevoke = false,
    canSuspend = false,
  } = actionCapabilities;
  const hasAdministrativeActions = canChangeRole
    || canReactivate
    || canRevoke
    || canSuspend;

  return (
    <EntityDetailsDrawer
      description="Identité, rôle, état d’accès et cycle de vie du membre de l’équipe de la Plateforme."
      onClose={onClose}
      open={open}
      title={title}
    >
      {member && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Identité
            </h3>
            <dl className="mt-2">
              <DetailRow label="Nom" value={formatPlatformTeamMemberName(member)} />
              <DetailRow label="Email" value={member.user?.email} />
              <DetailRow
                label="Statut du compte"
                value={formatPlatformUserStatus(member.user?.status)}
              />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Accès à la Plateforme
            </h3>
            <dl className="mt-2">
              <DetailRow
                label="Qualité"
                value={member.isFounder
                  ? <PlatformFounderBadge />
                  : 'Membre plateforme'}
              />
              <DetailRow label="Rôle" value={member.role?.name} />
              <DetailRow
                label="Description du rôle"
                value={member.role?.description}
              />
              <DetailRow
                label="Statut d’accès"
                value={<PlatformTeamMemberStatusBadge status={member.status} />}
              />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cycle de vie
            </h3>
            <dl className="mt-2">
              <DetailRow
                label="Membre depuis"
                value={formatPlatformUserDate(member.joinedAt)}
              />
              {member.suspendedAt && (
                <DetailRow
                  label="Suspendu le"
                  value={formatPlatformUserDate(member.suspendedAt)}
                />
              )}
              {member.revokedAt && (
                <DetailRow
                  label="Révoqué le"
                  value={formatPlatformUserDate(member.revokedAt)}
                />
              )}
              <DetailRow
                label="Créé le"
                value={formatPlatformUserDate(member.createdAt)}
              />
              <DetailRow
                label="Mis à jour le"
                value={formatPlatformUserDate(member.updatedAt)}
              />
            </dl>
          </section>

          {hasAdministrativeActions && (
            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <h3 className="font-semibold">Actions d’administration</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gérez le rôle et l’accès interne de ce membre selon vos permissions Platform.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {canChangeRole && (
                  <Button
                    onClick={() => onRequestAction?.('update-role', member)}
                    type="button"
                    variant="outline"
                  >
                    <Pencil aria-hidden="true" className="mr-2 size-4" />
                    Modifier le rôle
                  </Button>
                )}

                {canSuspend && (
                  <Button
                    onClick={() => onRequestAction?.('suspend', member)}
                    type="button"
                    variant="outline"
                  >
                    <Pause aria-hidden="true" className="mr-2 size-4" />
                    Suspendre
                  </Button>
                )}

                {canReactivate && (
                  <Button
                    onClick={() => onRequestAction?.('reactivate', member)}
                    type="button"
                    variant="outline"
                  >
                    <Play aria-hidden="true" className="mr-2 size-4" />
                    Réactiver
                  </Button>
                )}

                {canRevoke && (
                  <Button
                    onClick={() => onRequestAction?.('revoke', member)}
                    type="button"
                    variant="destructive"
                  >
                    <UserMinus aria-hidden="true" className="mr-2 size-4" />
                    Révoquer
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformTeamMemberDetailsDrawer };
