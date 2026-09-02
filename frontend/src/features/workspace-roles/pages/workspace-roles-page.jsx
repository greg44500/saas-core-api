import { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';

import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { Button } from '@/components/ui/button';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import {
  useCreateWorkspaceRoleMutation,
  useDeleteWorkspaceRoleMutation,
  useListWorkspaceRolesQuery,
  useUpdateWorkspaceRoleMutation,
} from '@/features/workspace-roles/api/workspace-roles-api';
import { RoleFormDrawer } from '@/features/workspace-roles/components/role-form-drawer';
import { RolePermissionsDrawer } from '@/features/workspace-roles/components/role-permissions-drawer';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function RoleTypeBadge({ role }) {
  return (
    <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {role.isSystem ? 'Système' : 'Personnalisé'}
    </span>
  );
}

function WorkspaceRolesPage() {
  const { can, permissions, workspace } = useWorkspaceContext();
  const rolesQuery = useListWorkspaceRolesQuery(workspace.id);
  const [createRole, createState] = useCreateWorkspaceRoleMutation();
  const [updateRole, updateState] = useUpdateWorkspaceRoleMutation();
  const [deleteRole, deleteState] = useDeleteWorkspaceRoleMutation();

  const [selectedRole, setSelectedRole] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const roles = rolesQuery.data ?? [];
  const actorPermissionSet = useMemo(() => new Set(permissions), [permissions]);

  function openCreate() {
    setEditingRole(null);
    setFormMode('create');
  }

  function openEdit(role) {
    setEditingRole(role);
    setFormMode('edit');
  }

  function closeForm() {
    if (createState.isLoading || updateState.isLoading) return;
    setFormMode(null);
    setEditingRole(null);
  }

  async function handleFormSubmit(values) {
    setFeedback(null);

    try {
      if (formMode === 'edit' && editingRole) {
        await updateRole({
          workspaceId: workspace.id,
          roleId: editingRole.id,
          ...values,
        }).unwrap();
        setFeedback({ type: 'success', message: 'Rôle mis à jour.' });
      } else {
        await createRole({ workspaceId: workspace.id, ...values }).unwrap();
        setFeedback({ type: 'success', message: 'Rôle créé.' });
      }
      closeForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiMessage(error, "Le rôle n’a pas pu être enregistré."),
      });
    }
  }

  async function confirmDelete() {
    if (!deleteCandidate) return;
    setFeedback(null);

    try {
      await deleteRole({
        workspaceId: workspace.id,
        roleId: deleteCandidate.id,
      }).unwrap();
      setDeleteCandidate(null);
      setFeedback({ type: 'success', message: 'Rôle supprimé.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiMessage(
          error,
          "Le rôle ne peut pas être supprimé. Vérifiez qu’il n’est plus utilisé.",
        ),
      });
    }
  }

  if (rolesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des rôles…</p>;
  }

  if (rolesQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Rôles et permissions</h1>
        <p className="text-sm text-destructive">Impossible de charger les rôles du workspace.</p>
        <Button onClick={rolesQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  const columns = [
    {
      id: 'role',
      header: 'Rôle',
      cell: (role) => (
        <>
          <p className="font-medium">{role.name}</p>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {role.description || 'Aucune description.'}
          </p>
        </>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (role) => <RoleTypeBadge role={role} />,
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: (role) => role.permissions?.length ?? 0,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (role) => {
        const editable = !role.isSystem && role.isEditable === true;
        const actorCanAdminister = (role.permissions ?? []).every(
          (permission) => actorPermissionSet.has(permission),
        );
        const administrable = editable && actorCanAdminister;

        return (
          <DataTableActions className="flex-wrap">
            <ActionIconButton
              Icon={Eye}
              label="Voir"
              onClick={() => setSelectedRole(role)}
              variant="outline"
            />

            {/*
             * L'absence d'action suffit à traduire la non-modifiabilité
             * d'un rôle. Répéter des mentions techniques comme « Protégé »
             * ou « Niveau supérieur » sur chaque ligne alourdit le tableau ;
             * le backend reste l'autorité qui refuse toute escalade.
             */}
            {administrable && can(WORKSPACE_PERMISSION.ROLE_UPDATE) && (
              <ActionIconButton
                Icon={Pencil}
                label="Modifier"
                onClick={() => openEdit(role)}
                variant="outline"
              />
            )}
            {administrable && can(WORKSPACE_PERMISSION.ROLE_DELETE) && (
              <ActionIconButton
                Icon={Trash2}
                label="Supprimer"
                onClick={() => setDeleteCandidate(role)}
                variant="destructive"
              />
            )}
          </DataTableActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rôles et permissions</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Consultez les rôles de {workspace.name} et gérez les rôles personnalisés dans la limite de vos propres permissions.
          </p>
        </div>
        {can(WORKSPACE_PERMISSION.ROLE_CREATE) && (
          <Button onClick={openCreate} type="button">
            Créer un rôle
          </Button>
        )}
      </header>

      {feedback && (
        <p
          className={`rounded-md border p-3 text-sm ${
            feedback.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-success/30 bg-success/10'
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      {deleteCandidate && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <h2 className="font-semibold">Supprimer le rôle « {deleteCandidate.name} » ?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La suppression sera refusée s’il est encore attribué à un membre actif ou suspendu, ou utilisé par une invitation en attente.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={deleteState.isLoading}
              onClick={confirmDelete}
              type="button"
              variant="destructive"
            >
              {deleteState.isLoading ? 'Suppression…' : 'Confirmer la suppression'}
            </Button>
            <Button
              disabled={deleteState.isLoading}
              onClick={() => setDeleteCandidate(null)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Rôles du workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les rôles système sont consultables mais protégés contre les modifications génériques.
          </p>
        </div>

        {roles.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucun rôle disponible.</p>
        ) : (
          <DataTable columns={columns} data={roles} getRowKey={(role) => role.id} />
        )}
      </section>

      <RolePermissionsDrawer
        onClose={() => setSelectedRole(null)}
        open={Boolean(selectedRole)}
        role={selectedRole}
      />

      <RoleFormDrawer
        actorPermissions={permissions}
        mode={formMode}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        open={Boolean(formMode)}
        pending={createState.isLoading || updateState.isLoading}
        role={editingRole}
      />
    </div>
  );
}

export { RoleTypeBadge, WorkspaceRolesPage, getApiMessage };
