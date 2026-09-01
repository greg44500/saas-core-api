import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import {
  useCreateWorkspaceInvitationMutation,
  useListWorkspaceInvitationsQuery,
  useListWorkspaceMembersQuery,
  useListWorkspaceRolesQuery,
  useRemoveWorkspaceMemberMutation,
  useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation,
  useSuspendWorkspaceMemberMutation,
  useUpdateWorkspaceMemberRoleMutation,
} from '@/features/workspace-members/api/workspace-members-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function Pagination({ page, pagination, onPageChange }) {
  const totalPages = pagination?.totalPages ?? 1;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} sur {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

function ConfirmationDialog({ action, onCancel, onConfirm, pending }) {
  if (!action) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4"
      role="presentation"
    >
      <section
        aria-labelledby="member-action-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        role="dialog"
      >
        <div className="space-y-2">
          <h2 id="member-action-title" className="text-lg font-semibold">
            Confirmer l’action
          </h2>
          <p className="text-sm text-muted-foreground">{action.message}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? 'Traitement…' : 'Confirmer'}
          </Button>
        </div>
      </section>
    </div>
  );
}

function WorkspaceMembersPage() {
  const { workspace, membership, can } = useWorkspaceContext();
  const { data: currentUser } = useGetCurrentUserQuery();
  const [memberPage, setMemberPage] = useState(1);
  const [invitationPage, setInvitationPage] = useState(1);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

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
  const [revokeInvitation] = useRevokeWorkspaceInvitationMutation();
  const [updateMemberRole, updateRoleState] = useUpdateWorkspaceMemberRoleMutation();
  const [suspendMember, suspendState] = useSuspendWorkspaceMemberMutation();
  const [removeMember, removeState] = useRemoveWorkspaceMemberMutation();

  const assignableRoles = useMemo(
    () => (rolesQuery.data ?? []).filter((role) => role.key !== 'owner'),
    [rolesQuery.data],
  );

  async function handleInvite(event) {
    event.preventDefault();
    setFeedback(null);

    try {
      await createInvitation({
        workspaceId: workspace.id,
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      }).unwrap();
      setInviteEmail('');
      setInviteRoleId('');
      setFeedback({ type: 'success', message: 'Invitation envoyée.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiMessage(error, "L’invitation n’a pas pu être envoyée."),
      });
    }
  }

  async function handleRoleChange(memberId, roleId) {
    setFeedback(null);
    try {
      await updateMemberRole({ workspaceId: workspace.id, memberId, roleId }).unwrap();
      setFeedback({ type: 'success', message: 'Rôle mis à jour.' });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiMessage(error, 'Le rôle n’a pas pu être modifié.') });
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setFeedback(null);

    try {
      if (pendingAction.type === 'suspend') {
        await suspendMember({ workspaceId: workspace.id, memberId: pendingAction.id }).unwrap();
        setFeedback({ type: 'success', message: 'Membre suspendu.' });
      }
      if (pendingAction.type === 'remove') {
        await removeMember({ workspaceId: workspace.id, memberId: pendingAction.id }).unwrap();
        setFeedback({ type: 'success', message: 'Membre retiré du workspace.' });
      }
      if (pendingAction.type === 'revoke-invitation') {
        await revokeInvitation({ workspaceId: workspace.id, invitationId: pendingAction.id }).unwrap();
        setFeedback({ type: 'success', message: 'Invitation révoquée.' });
      }
      setPendingAction(null);
    } catch (error) {
      setFeedback({ type: 'error', message: getApiMessage(error, "L’action n’a pas pu être effectuée.") });
    }
  }

  const mutationPending = suspendState.isLoading || removeState.isLoading;

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Membres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les accès à {workspace.name} selon les permissions de votre rôle.
        </p>
      </div>

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

      {can(WORKSPACE_PERMISSION.MEMBER_INVITE) && can(WORKSPACE_PERMISSION.ROLE_READ) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Inviter un membre</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={handleInvite}>
            <Input
              aria-label="Email du membre"
              autoComplete="email"
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="membre@entreprise.fr"
            />
            <select
              aria-label="Rôle du membre"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              required
              value={inviteRoleId}
              onChange={(event) => setInviteRoleId(event.target.value)}
            >
              <option value="">Choisir un rôle</option>
              {assignableRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Utilisateur</th>
                <th className="px-5 py-3 font-medium">Rôle</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(membersQuery.data?.members ?? []).map((member) => {
                const isSelf = member.user.id === currentUser?.id;
                const isOwner = member.role.key === 'owner';
                const protectedMember = isSelf || isOwner;

                return (
                  <tr key={member.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{member.user.firstName} {member.user.lastName}</p>
                      {isSelf && <p className="text-xs text-muted-foreground">Vous</p>}
                    </td>
                    <td className="px-5 py-4">
                      {can(WORKSPACE_PERMISSION.MEMBER_UPDATE) && !protectedMember && assignableRoles.length > 0 ? (
                        <select
                          aria-label={`Rôle de ${member.user.firstName} ${member.user.lastName}`}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          disabled={updateRoleState.isLoading}
                          value={member.role.id}
                          onChange={(event) => handleRoleChange(member.id, event.target.value)}
                        >
                          {assignableRoles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      ) : member.role.name}
                    </td>
                    <td className="px-5 py-4 capitalize">{member.status}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {can(WORKSPACE_PERMISSION.MEMBER_SUSPEND) && !protectedMember && member.status === 'active' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPendingAction({
                              type: 'suspend',
                              id: member.id,
                              message: `Suspendre ${member.user.firstName} ${member.user.lastName} ?`,
                            })}
                          >
                            Suspendre
                          </Button>
                        )}
                        {can(WORKSPACE_PERMISSION.MEMBER_REMOVE) && !protectedMember && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setPendingAction({
                              type: 'remove',
                              id: member.id,
                              message: `Retirer ${member.user.firstName} ${member.user.lastName} de ce workspace ?`,
                            })}
                          >
                            Retirer
                          </Button>
                        )}
                        {protectedMember && <span className="text-xs text-muted-foreground">Protégé</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-5">
          <Pagination
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
                      {invitation.status} · livraison {invitation.deliveryStatus}
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
                              setFeedback({ type: 'success', message: 'Invitation renvoyée.' });
                            } catch (error) {
                              setFeedback({ type: 'error', message: getApiMessage(error, "L’invitation n’a pas pu être renvoyée.") });
                            }
                          }}
                        >
                          Renvoyer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingAction({
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
            <Pagination
              page={invitationPage}
              pagination={invitationsQuery.data?.pagination}
              onPageChange={setInvitationPage}
            />
          </div>
        </section>
      )}

      <ConfirmationDialog
        action={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        pending={mutationPending}
      />
    </div>
  );
}

export { ConfirmationDialog, Pagination, WorkspaceMembersPage };
