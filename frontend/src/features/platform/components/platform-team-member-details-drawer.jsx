import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
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
  currentUserId,
  member,
  onClose,
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
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformTeamMemberDetailsDrawer };
