import { Archive, Eye, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  useArchivePlatformRoleMutation,
  useListPlatformRolesQuery,
} from '@/features/platform/api/platform-roles-api';
import {
  PlatformRoleStatusBadge,
  PlatformRoleTypeBadge,
} from '@/features/platform/components/platform-role-badges';
import { PlatformRoleDetailsDrawer } from '@/features/platform/components/platform-role-details-drawer';
import { PlatformRoleFormDrawer } from '@/features/platform/components/platform-role-form-drawer';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import { PLATFORM_ROLE_STATUS } from '@/features/platform/constants/platform-team';
import {
  canActorManageTargetRole,
} from '@/features/platform/lib/platform-team-authorization';

const PLATFORM_ROLES_PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformRolesSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [detailsRoleId, setDetailsRoleId] = useState(null);
  const [formState, setFormState] = useState(null);
  const [archiveRole, setArchiveRole] = useState(null);
  const [archiveError, setArchiveError] = useState(null);

  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const permissionSet = new Set(platformAccess?.permissions ?? []);
  const canCreate = permissionSet.has(PLATFORM_PERMISSION.ROLES_CREATE);
  const canUpdate = permissionSet.has(PLATFORM_PERMISSION.ROLES_UPDATE);
  const canArchive = permissionSet.has(PLATFORM_PERMISSION.ROLES_ARCHIVE);

  const rolesQuery = useListPlatformRolesQuery({
    page,
    limit: PLATFORM_ROLES_PAGE_SIZE,
    status: 'all',
  });
  const [archivePlatformRole, archiveState] =
    useArchivePlatformRoleMutation();

  const roles = rolesQuery.data?.roles ?? [];
  const pagination = rolesQuery.data?.pagination ?? {
    page,
    limit: PLATFORM_ROLES_PAGE_SIZE,
    total: roles.length,
    totalPages: roles.length > 0 ? 1 : 0,
  };

  function canMutateRole(role, permissionGranted) {
    return permissionGranted
      && role?.isSystem === false
      && role?.status === PLATFORM_ROLE_STATUS.ACTIVE
      && canActorManageTargetRole({ platformAccess, targetRole: role });
  }

  const columns = useMemo(() => [
    {
      id: 'role',
      header: 'Rôle',
      cell: (role) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{role.name}</p>
          {role.description && (
            <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
              {role.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (role) => <PlatformRoleTypeBadge isSystem={role.isSystem} />,
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: (role) => (
        <span className="font-medium text-foreground">
          {role.permissions?.length ?? 0}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (role) => <PlatformRoleStatusBadge status={role.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'w-px whitespace-nowrap text-right',
      cellClassName: 'w-px whitespace-nowrap text-right',
      cell: (role) => {
        const roleCanBeUpdated = canMutateRole(role, canUpdate);
        const roleCanBeArchived = canMutateRole(role, canArchive);

        return (
          <DataTableActions className="justify-end">
            <ActionIconButton
              Icon={Eye}
              label={`Voir les permissions de ${role.name}`}
              onClick={() => setDetailsRoleId(role.id)}
              variant="ghost"
            />
            {roleCanBeUpdated && (
              <ActionIconButton
                Icon={Pencil}
                label={`Modifier le rôle ${role.name}`}
                onClick={() => setFormState({ mode: 'edit', role })}
                variant="ghost"
              />
            )}
            {roleCanBeArchived && (
              <ActionIconButton
                Icon={Archive}
                label={`Archiver le rôle ${role.name}`}
                onClick={() => {
                  setArchiveError(null);
                  setArchiveRole(role);
                }}
                variant="ghost"
              />
            )}
          </DataTableActions>
        );
      },
    },
  ], [canArchive, canUpdate, platformAccess]);

  async function confirmArchive() {
    if (!archiveRole) return;
    setArchiveError(null);

    try {
      await archivePlatformRole(archiveRole.id).unwrap();
      toast({
        title: 'Rôle archivé',
        description: `Le rôle ${archiveRole.name} n’est plus assignable.`,
        variant: 'success',
      });
      setArchiveRole(null);
    } catch (error) {
      setArchiveError(getApiMessage(
        error,
        'Impossible d’archiver ce rôle.',
      ));
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Les rôles système sont protégés. Les rôles personnalisés peuvent être gérés selon votre niveau d’autorisation.
        </p>

        {canCreate && (
          <Button
            onClick={() => setFormState({ mode: 'create', role: null })}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Créer un rôle
          </Button>
        )}
      </div>

      {rolesQuery.isLoading && (
        <p className="text-sm text-muted-foreground">
          Chargement des rôles…
        </p>
      )}

      {rolesQuery.isError && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger les rôles de la Plateforme.
          </p>
          <Button
            onClick={rolesQuery.refetch}
            type="button"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      )}

      {!rolesQuery.isLoading && !rolesQuery.isError && roles.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          Aucun rôle disponible.
        </p>
      )}

      {!rolesQuery.isLoading && !rolesQuery.isError && roles.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <DataTable
              columns={columns}
              data={roles}
              getRowKey={(role) => role.id}
            />
          </div>

          <DataPagination
            disabled={rolesQuery.isFetching}
            onPageChange={setPage}
            page={page}
            pagination={pagination}
            summary={`${pagination.total} rôle${pagination.total > 1 ? 's' : ''}`}
          />
        </>
      )}

      <PlatformRoleDetailsDrawer
        onClose={() => setDetailsRoleId(null)}
        open={Boolean(detailsRoleId)}
        roleId={detailsRoleId}
      />

      <PlatformRoleFormDrawer
        mode={formState?.mode ?? 'create'}
        onClose={() => setFormState(null)}
        open={Boolean(formState)}
        platformAccess={platformAccess}
        role={formState?.role ?? null}
      />

      <ConfirmationDialog
        confirmLabel="Archiver"
        description={archiveRole
          ? `Archiver le rôle ${archiveRole.name} ? Il ne pourra plus être attribué. L’opération sera refusée s’il est encore utilisé par un membre actif ou suspendu.`
          : ''}
        errorMessage={archiveError}
        onCancel={() => {
          if (archiveState.isLoading) return;
          setArchiveRole(null);
          setArchiveError(null);
        }}
        onConfirm={confirmArchive}
        open={Boolean(archiveRole)}
        pending={archiveState.isLoading}
        pendingLabel="Archivage…"
        title="Archiver le rôle"
      />
    </div>
  );
}

export {
  PLATFORM_ROLES_PAGE_SIZE,
  PlatformRolesSection,
};
