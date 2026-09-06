import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import {
  useGetPlatformRolePermissionCatalogQuery,
  useGetPlatformRoleQuery,
} from '@/features/platform/api/platform-roles-api';
import {
  PlatformRoleStatusBadge,
  PlatformRoleTypeBadge,
} from '@/features/platform/components/platform-role-badges';
import {
  formatPlatformPermissionSensitivity,
  groupPlatformPermissions,
} from '@/features/platform/lib/platform-permission-catalog';

function PlatformRoleDetailsDrawer({ onClose, open, roleId }) {
  const roleQuery = useGetPlatformRoleQuery(roleId, {
    skip: !open || !roleId,
  });
  const catalogQuery = useGetPlatformRolePermissionCatalogQuery(undefined, {
    skip: !open,
  });

  const role = roleQuery.data;
  const catalog = catalogQuery.data ?? [];
  const definitionsByKey = new Map(
    catalog.map((permission) => [permission.key, permission]),
  );
  const selectedDefinitions = (role?.permissions ?? []).map((key) => (
    definitionsByKey.get(key) ?? {
      key,
      label: 'Permission non documentée',
      category: 'other',
      categoryLabel: 'Autres',
      description: 'Cette permission n’est pas présente dans le catalogue courant.',
      sensitivity: null,
    }
  ));
  const groups = groupPlatformPermissions(selectedDefinitions);

  return (
    <EntityDetailsDrawer
      description="Consultez la nature du rôle et les permissions qui lui sont effectivement attribuées."
      onClose={onClose}
      open={open}
      title={role?.name ?? 'Détail du rôle'}
    >
      {(roleQuery.isLoading || catalogQuery.isLoading) && (
        <p className="text-sm text-muted-foreground">
          Chargement du rôle…
        </p>
      )}

      {(roleQuery.isError || catalogQuery.isError) && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger le détail du rôle.
          </p>
          <Button
            onClick={() => {
              roleQuery.refetch();
              catalogQuery.refetch();
            }}
            type="button"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      )}

      {role && !catalogQuery.isLoading && !catalogQuery.isError && (
        <div className="space-y-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="mt-1">
                <PlatformRoleTypeBadge isSystem={role.isSystem} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="mt-1">
                <PlatformRoleStatusBadge status={role.status} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-1 text-foreground">
                {role.description || 'Aucune description.'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Permissions</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {role.permissions?.length ?? 0}
              </dd>
            </div>
          </dl>

          <div className="space-y-5">
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune permission attribuée à ce rôle.
              </p>
            )}

            {groups.map((group) => (
              <section className="space-y-2" key={group.key}>
                <h3 className="text-sm font-semibold text-foreground">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.permissions.map((permission) => (
                    <div
                      className="rounded-lg border border-border p-3"
                      key={permission.key}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {permission.label}
                        </p>
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {formatPlatformPermissionSensitivity(
                            permission.sensitivity,
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformRoleDetailsDrawer };
