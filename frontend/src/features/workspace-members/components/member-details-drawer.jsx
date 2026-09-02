import { useRef } from 'react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { PermissionList } from '@/features/workspace-roles/components/permission-list';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function MemberDetailsDrawer({ member, onClose, open, role }) {
  const retainedDetailsRef = useRef(null);

  /*
   * La page retire immédiatement la sélection lorsqu'elle ferme le panneau.
   * On conserve donc les dernières données affichées afin que le Drawer reste
   * rendu pendant sa transition de sortie au lieu de disparaître brutalement.
   */
  if (member) {
    retainedDetailsRef.current = { member, role };
  }

  const displayedMember = member ?? retainedDetailsRef.current?.member ?? null;
  const displayedRole = member ? role : retainedDetailsRef.current?.role ?? null;

  if (!displayedMember) return null;

  const fullName = `${displayedMember.user.firstName} ${displayedMember.user.lastName}`.trim();

  return (
    <EntityDetailsDrawer
      description="Détail de l’appartenance et des permissions effectives liées au rôle."
      onClose={onClose}
      open={open}
      title={fullName || 'Détail du membre'}
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card px-4">
          <dl>
            <DetailRow label="Statut" value={displayedMember.status} />
            <DetailRow label="Rôle" value={displayedMember.role.name} />
            {displayedMember.joinedAt && (
              <DetailRow
                label="Membre depuis"
                value={new Date(displayedMember.joinedAt).toLocaleDateString('fr-FR')}
              />
            )}
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-semibold">Permissions effectives du rôle</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ces permissions proviennent du rôle actuellement attribué à ce membre.
          </p>
          <div className="mt-3">
            {displayedRole ? (
              <PermissionList permissions={displayedRole.permissions} />
            ) : (
              <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Les permissions détaillées ne sont pas accessibles avec vos droits actuels.
              </p>
            )}
          </div>
        </section>
      </div>
    </EntityDetailsDrawer>
  );
}

export { MemberDetailsDrawer };
