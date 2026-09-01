import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { PermissionList } from '@/features/workspace-members/components/permission-list';

function RolePermissionsDrawer({ onClose, open, role }) {
  if (!role) return null;

  return (
    <EntityDetailsDrawer
      description={role.description ?? 'Permissions effectives attribuées par ce rôle.'}
      onClose={onClose}
      open={open}
      title={role.name}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Type de rôle
          </p>
          <p className="mt-1 text-sm font-medium">
            {role.isSystem ? 'Rôle système' : 'Rôle personnalisé'}
          </p>
        </div>

        <section>
          <h3 className="text-sm font-semibold">Permissions</h3>
          <div className="mt-3">
            <PermissionList permissions={role.permissions} />
          </div>
        </section>
      </div>
    </EntityDetailsDrawer>
  );
}

export { RolePermissionsDrawer };
