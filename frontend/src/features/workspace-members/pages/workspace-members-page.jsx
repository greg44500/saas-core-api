import { useMemo, useState } from 'react';
import { Ban, Eye, UserMinus } from 'lucide-react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { useToast } from '@/components/shared/toast-provider';
import { Tooltip } from '@/components/shared/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import {
  useCreateWorkspaceInvitationMutation,
  useListWorkspaceInvitationsQuery,
  useListWorkspaceMembersQuery,
  useRemoveWorkspaceMemberMutation,
  useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation,
  useSuspendWorkspaceMemberMutation,
  useUpdateWorkspaceMemberRoleMutation,
} from '@/features/workspace-members/api/workspace-members-api';
import { MemberDetailsDrawer } from '@/features/workspace-members/components/member-details-drawer';
import { RolePermissionsDrawer } from '@/features/workspace-members/components/role-permissions-drawer';
import {
  formatInvitationDeliveryStatus,
  formatInvitationStatus,
  formatMemberStatus,
} from '@/features/workspace-members/lib/workspace-member-formatters';
import { useListWorkspaceRolesQuery } from '@/features/workspace-roles/api/workspace-roles-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function WorkspaceMembersPage() {
  const { workspace, permissions, can } = useWorkspaceContext();
  const { toast } = useToast();
  const { data: currentUser } = useGetCurrentUserQuery();
  const [memberPage, setMemberPage] = useState(1);
  const [invitationPage, setInvitationPage] = useState(1);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionError, setPendingActionError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  const membersQuery = useListWorkspaceMembersQuery({
    workspaceId: workspace.id,
    page: memberPage,
    limit: PAGE_SIZE,
  });
  const rolesQuery = useListWorkspaceRolesQuery(workspace.id, {
    skip: !can(WORKSPACE_PERMISSION.ROLE_READ),
  });
  const invitationsQuery = useListWorkspaceInvitationsQuery(
    {
      workspaceId: workspace.id,
      page: invitationPage,
      limit: PAGE_SIZE,
    },
    { skip: !can(WORKSPACE_PERMISSION.MEMBER_INVITE) },
  );

  const [createInvitation, createInvitationState] = useCreateWorkspaceInvitationMutation();
  const [resendInvitation] = useResendWorkspaceInvitationMutation();
  const [revokeInvitation, revokeInvitationState] = useRevokeWorkspaceInvitationMutation();
  const [updateMemberRole, updateRoleState] = useUpdateWorkspaceMemberRoleMutation();
  const [suspendMember, suspendState] = useSuspendWorkspaceMemberMutation();
  const [removeMember, removeState] = useRemoveWorkspaceMemberMutation();

  const actorPermissionSet = useMemo(() => new Set(permissions), [permissions]);

  const assignableRoles = useMemo(
    () =>
      (rolesQuery.data ?? []).filter(
        (role) =>
          role.key !== 'owner' &&
          (role.permissions ?? []).every((permission) => actorPermissionSet.has(permission)),
      ),
    [actorPermissionSet, rolesQuery.data],
  );

  const selectedInviteRole = useMemo(
    () => (rolesQuery.data ?? []).find((role) => role.id === inviteRoleId) ?? null,
    [inviteRoleId, rolesQuery.data],
  );

  const selectedMemberRole = useMemo(
    () =>
      selectedMember
        ? (rolesQuery.data ?? []).find((role) => role.id === selectedMember.role.id) ?? null
        : null,
    [rolesQuery.data, selectedMember],
  );

  async function handleInvite(event) {
    event.preventDefault();

    try {
      await createInvitation({
        workspaceId: workspace.id,
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      }).unwrap();
      setInviteEmail('');
      setInviteRoleId('');
      toast({ title: 'Invitation envoyée', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Envoi de l’invitation impossible',
        description: getApiMessage(error, "L’invitation n’a pas pu être envoyée."),
        variant: 'error',
      });
    }
  }

  async function handleRoleChange(memberId, roleId) {
    try {
      await updateMemberRole({ workspaceId: workspace.id, memberId, roleId }).unwrap();
      toast({ title: 'Rôle du membre mis à jour', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Modification du rôle impossible',
        description: getApiMessage(error, 'Le rôle n’a pas pu être modifié.'),
        variant: 'error',
      });
    }
  }

  function openPendingAction(action) {
    setPendingActionError(null);
    setPendingAction(action);
  }

  function closePendingAction() {
    if (mutationPending) return;
    setPendingActionError(null);
    setPendingAction(null);
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setPendingActionError(null);

    try {
      if (pendingAction.type === 'suspend') {
        await suspendMember({ workspaceId: workspace.id, memberId: pendingAction.id }).unwrap();
        toast({ title: 'Membre suspendu', variant: 'success' });
      }
      if (pendingAction.type === 'remove') {
        await removeMember({ workspaceId: workspace.id, memberId: pendingAction.id }).unwrap();
        toast({ title: 'Membre retiré du workspace', variant: 'success' });
      }
      if (pendingAction.type === 'revoke-invitation') {
        await revokeInvitation({ workspaceId: workspace.id, invitationId: pendingAction.id }).unwrap();
        toast({ title: 'Invitation révoquée', variant: 'success' });
      }
      setPendingAction(null);
    } catch (error) {
      setPendingActionError(
        getApiMessage(error, "L’action n’a pas pu être effectuée."),
      );
    }
  }

  const mutationPending =
    suspendState.isLoading || removeState.isLoading || revokeInvitationState.isLoading;

  if (membersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des membres…</p>;
  }

  if (membersQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Membres</h1>
        <p className="text-sm text-destructive">Impossible de charger les membres du workspace.</p>
        <Button type="button" variant="outline" onClick={membersQuery.refetch}>Réessayer</Button>
      </section>
    );
  }

  const memberColumns = [
    {
      id: 'user',
      header: 'Utilisateur',
      cell: (member) => {
        const isSelf = member.user.id === currentUser?.id;
        const memberName = `${member.user.firstName} ${member.user.lastName}`;

        return isSelf ? (
          <Tooltip content="Vous">
            <span className="cursor-help font-medium underline decoration-dotted underline-offset-4">
              {memberName}
            </span>
          </Tooltip>
        ) : (
          <p className="font-medium">{memberName}</p>
        );
      },
    },
    {
      id: 'role',
      header: 'Rôle',
      cell: (member) => {
        const isSelf = member.user.id === currentUser?.id;
        const isOwner = member.role.key === 'owner';
        const protectedMember = isSelf || isOwner;
        const memberName = `${member.user.firstName} ${member.user.lastName}`;

        return can(WORKSPACE_PERMISSION.MEMBER_UPDATE) && !protectedMember && assignableRoles.length > 0 ? (
          <select
            aria-label={`Rôle de ${memberName}`}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            disabled={updateRoleState.isLoading}
            value={member.role.id}
            onChange={(event) => handleRoleChange(member.id, event.target.value)}
          >
            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        ) : member.role.name;
      },
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (member) => formatMemberStatus(member.status),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (member) => {
        const isSelf = member.user.id === currentUser?.id;
        const isOwner = member.role.key === 'owner';
        const protectedMember = isSelf || isOwner;
        const memberName = `${member.user.firstName} ${member.user.lastName}`;

        return (
          <DataTableActions className="flex-wrap">
            <ActionIconButton
              Icon={Eye}
              label="Voir"
              onClick={() => setSelectedMember(member)}
              variant="outline"
            />

            {/*
             * L'utilisateur courant et l'owner restent protégés par les
             * règles serveur. L'interface masque simplement les actions
             * impossibles au lieu de répéter un statut technique à chaque ligne.
             */}
            {can(WORKSPACE_PERMISSION.MEMBER_SUSPEND) && !protectedMember && member.status === 'active' && (
              <ActionIconButton
                Icon={Ban}
                label="Suspendre"
                onClick={() => openPendingAction({
                  type: 'suspend',
                  id: member.id,
                  message: `Suspendre ${memberName} ?`,
                })}
                variant="outline"
              />
            )}
            {can(WORKSPACE_PERMISSION.MEMBER_REMOVE) && !protectedMember && (
              <ActionIconButton
                Icon={UserMinus}
                label="Retirer"
                onClick={() => openPendingAction({
                  type: 'remove',
                  id: member.id,
                  message: `Retirer ${memberName} de ce workspace ?`,
                })}
                variant="destructive"
              />
            )}
          </DataTableActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Membres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les accès à {workspace.name} selon les permissions de votre rôle.
        </p>
      </div>

      {can(WORKSPACE_PERMISSION.MEMBER_INVITE) && can(WORKSPACE_PERMISSION.ROLE_READ) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Inviter un membre</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_260px_auto]" onSubmit={handleInvite}>
            <Input
              aria-label="Email du membre"
              autoComplete="email"
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="membre@entreprise.fr"
            />
            <div className="space-y-2">
              <select
                aria-label="Rôle du membre"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
                value={inviteRoleId}
                onChange={(event) => setInviteRoleId(event.target.value)}
              >
                <option value="">Choisir un rôle</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              {selectedInviteRole && (
                <Button
                  className="h-auto px-0 py-0 text-xs"
                  onClick={() => setSelectedRole(selectedInviteRole)}
                  type="button"
                  variant="link"
                >
                  Voir les permissions détaillées
                </Button>
              )}
            </div>
            <Button type="submit" disabled={createInvitationState.isLoading || !inviteEmail || !inviteRoleId}>
              {createInvitationState.isLoading ? 'Envoi…' : 'Inviter'}
            </Button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Membres actuels</h2>
        </div>
        <DataTable
          columns={memberColumns}
          data={membersQuery.data?.members ?? []}
          getRowKey={(member) => member.id}
        />
        <div className="px-5 pb-5">
          <DataPagination
            page={memberPage}
            pagination={membersQuery.data?.pagination}
            onPageChange={setMemberPage}
          />
        </div>
      </section>

      {can(WORKSPACE_PERMISSION.MEMBER_INVITE) && (
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Invitations</h2>
          </div>
          <div className="divide-y divide-border">
            {(invitationsQuery.data?.invitations ?? []).length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Aucune invitation.</p>
            ) : (
              invitationsQuery.data.invitations.map((invitation) => (
                <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between" key={invitation.id}>
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatInvitationStatus(invitation.status)} · Envoi : {formatInvitationDeliveryStatus(invitation.deliveryStatus)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {invitation.status === 'pending' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await resendInvitation({ workspaceId: workspace.id, invitationId: invitation.id }).unwrap();
                              toast({ title: 'Invitation renvoyée', variant: 'success' });
                            } catch (error) {
                              toast({
                                title: 'Renvoi de l’invitation impossible',
                                description: getApiMessage(error, "L’invitation n’a pas pu être renvoyée."),
                                variant: 'error',
                              });
                            }
                          }}
                        >
                          Renvoyer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => openPendingAction({
                            type: 'revoke-invitation',
                            id: invitation.id,
                            message: `Révoquer l’invitation envoyée à ${invitation.email} ?`,
                          })}
                        >
                          Révoquer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-5 pb-5">
            <DataPagination
              page={invitationPage}
              pagination={invitationsQuery.data?.pagination}
              onPageChange={setInvitationPage}
            />
          </div>
        </section>
      )}

      <ConfirmationDialog
        description={pendingAction?.message}
        errorMessage={pendingActionError}
        onCancel={closePendingAction}
        onConfirm={confirmPendingAction}
        open={Boolean(pendingAction)}
        pending={mutationPending}
        title="Confirmer l’action"
      />

      <MemberDetailsDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        open={Boolean(selectedMember)}
        role={selectedMemberRole}
      />

      <RolePermissionsDrawer
        onClose={() => setSelectedRole(null)}
        open={Boolean(selectedRole)}
        role={selectedRole}
      />
    </div>
  );
}

export { WorkspaceMembersPage };
