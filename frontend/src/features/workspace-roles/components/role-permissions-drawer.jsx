import { useRef } from 'react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { PermissionList } from '@/features/workspace-roles/components/permission-list';

function RolePermissionsDrawer({ onClose, open, role }) {
  const retainedRoleRef = useRef(null);

  /*
   * Le parent efface la sélection dès la demande de fermeture. Conserver le
   * dernier rôle permet au composant partagé d'exécuter toute son animation de
   * sortie avant que le contenu ne disparaisse réellement du DOM.
   */
  if (role) {
    retainedRoleRef.current = role;
  }

  const displayedRole = role ?? retainedRoleRef.current;

  if (!displayedRole) return null;

  return (
    <EntityDetailsDrawer
      description={displayedRole.description ?? 'Permissions effectives attribuées par ce rôle.'}
      onClose={onClose}
      open={open}
      title={displayedRole.name}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Type de rôle
          </p>
          <p className="mt-1 text-sm font-medium">
            {displayedRole.isSystem ? 'Rôle système' : 'Rôle personnalisé'}
          </p>
        </div>

        <section>
          <h3 className="text-sm font-semibold">Permissions</h3>
          <div className="mt-3">
            <PermissionList permissions={displayedRole.permissions} />
          </div>
        </section>
      </div>
    </EntityDetailsDrawer>
  );
}

export { RolePermissionsDrawer };
