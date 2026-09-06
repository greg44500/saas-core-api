import { Pause, Pencil, Play, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { SelectField } from '@/components/forms/select-field';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { useListPlatformRolesQuery } from '@/features/platform/api/platform-roles-api';
import {
  useListPlatformTeamMembersQuery,
  useReactivatePlatformTeamMemberMutation,
  useRevokePlatformTeamMemberMutation,
  useSuspendPlatformTeamMemberMutation,
  useUpdatePlatformTeamMemberRoleMutation,
} from '@/features/platform/api/platform-team-api';
import {
  createPlatformTeamMemberReadColumns,
  formatPlatformTeamMemberName,
} from '@/features/platform/components/platform-team-member-read-columns';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  PLATFORM_TEAM_MEMBER_STATUS,
} from '@/features/platform/constants/platform-team';
import {
  canActorTargetPlatformMember,
  getAssignablePlatformRoles,
} from '@/features/platform/lib/platform-team-authorization';

const PLATFORM_TEAM_MEMBERS_PAGE_SIZE = 20;

const updateMemberRoleSchema = z.strictObject({
  roleId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Choisissez un rôle valide.'),
});

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function getMemberActionDescription(action) {
  if (!action?.member) return '';

  const name = formatPlatformTeamMemberName(action.member);

  if (action.type === 'update-role') {
    return `Modifier le rôle de ${name} ? Les droits effectifs seront mis à jour immédiatement.`;
  }

  if (action.type === 'suspend') {
    return `Suspendre l’accès Plateforme de ${name} ? Cette personne ne pourra plus utiliser ses permissions internes tant que son accès ne sera pas réactivé.`;
  }

  if (action.type === 'reactivate') {
    return `Réactiver l’accès Plateforme de ${name} avec son rôle actuel ?`;
  }

  if (action.type === 'revoke') {
    return `Retirer ${name} de l’équipe de la Plateforme ? Son appartenance à la Plateforme sera révoquée.`;
  }

  return '';
}

function getMemberActionTitle(type) {
  if (type === 'update-role') return 'Modifier le rôle';
  if (type === 'suspend') return 'Suspendre le membre';
  if (type === 'reactivate') return 'Réactiver le membre';
  if (type === 'revoke') return 'Retirer de l’équipe';
  return 'Confirmer l’action';
}

function PlatformTeamMembersSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionError, setPendingActionError] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const { data: currentUser } = useGetCurrentUserQuery();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const permissions = platformAccess?.permissions ?? [];
  const permissionSet = new Set(permissions);
  const canReadRoles = permissionSet.has(PLATFORM_PERMISSION.ROLES_READ);
  const canUpdateRole = canReadRoles
    && permissionSet.has(PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE);

  const membersQuery = useListPlatformTeamMembersQuery({
    page,
    limit: PLATFORM_TEAM_MEMBERS_PAGE_SIZE,
  });
  const rolesQuery = useListPlatformRolesQuery(
    { page: 1, limit: 100, status: 'active' },
    { skip: !canUpdateRole },
  );

  const [updateMemberRole, updateRoleState] =
    useUpdatePlatformTeamMemberRoleMutation();
  const [suspendMember, suspendState] =
    useSuspendPlatformTeamMemberMutation();
  const [reactivateMember, reactivateState] =
    useReactivatePlatformTeamMemberMutation();
  const [revokeMember, revokeState] =
    useRevokePlatformTeamMemberMutation();

  const mutationPending = updateRoleState.isLoading
    || suspendState.isLoading
    || reactivateState.isLoading
    || revokeState.isLoading;

  const roles = rolesQuery.data?.roles ?? [];

  function openPendingAction(type, member) {
    setPendingActionError(null);
    setSelectedRoleId('');
    setPendingAction({ type, member });
  }

  function closePendingAction() {
    if (mutationPending) return;

    setPendingAction(null);
    setPendingActionError(null);
    setSelectedRoleId('');
  }

  async function confirmPendingAction() {
    if (!pendingAction?.member) return;

    setPendingActionError(null);
    const memberId = pendingAction.member.id;

    try {
      if (pendingAction.type === 'update-role') {
        const validation = updateMemberRoleSchema.safeParse({
          roleId: selectedRoleId,
        });

        if (!validation.success) {
          setPendingActionError(
            validation.error.issues[0]?.message ?? 'Choisissez un rôle.',
          );
          return;
        }

        await updateMemberRole({
          memberId,
          roleId: validation.data.roleId,
        }).unwrap();

        toast({
          title: 'Rôle mis à jour',
          description: 'Les permissions du membre ont été recalculées.',
          variant: 'success',
        });
      }

      if (pendingAction.type === 'suspend') {
        await suspendMember(memberId).unwrap();
        toast({ title: 'Membre suspendu', variant: 'success' });
      }

      if (pendingAction.type === 'reactivate') {
        await reactivateMember(memberId).unwrap();
        toast({ title: 'Membre réactivé', variant: 'success' });
      }

      if (pendingAction.type === 'revoke') {
        await revokeMember(memberId).unwrap();
        toast({
          title: 'Membre retiré',
          description: 'Son appartenance à l’équipe de la Plateforme a été révoquée.',
          variant: 'success',
        });
      }

      setPendingAction(null);
      setSelectedRoleId('');
    } catch (error) {
      setPendingActionError(
        getApiMessage(
          error,
          "L’action sur le membre n’a pas pu être effectuée.",
        ),
      );
    }
  }

  if (membersQuery.isLoading) {
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        Chargement des membres…
      </p>
    );
  }

  if (membersQuery.error) {
    return (
      <div className="mt-5 space-y-3">
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les membres de l’équipe de la Plateforme.
        </p>
        <Button
          onClick={membersQuery.refetch}
          type="button"
          variant="outline"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const members = membersQuery.data?.members ?? [];
  const pagination = membersQuery.data?.pagination ?? {
    page,
    limit: PLATFORM_TEAM_MEMBERS_PAGE_SIZE,
    total: members.length,
    totalPages: members.length > 0 ? 1 : 0,
  };

  if (members.length === 0) {
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        Aucun membre actif ou suspendu dans l’équipe de la Plateforme.
      </p>
    );
  }

  function getActionCapabilities(member) {
    const canTarget = canActorTargetPlatformMember({
      currentUserId: currentUser?.id,
      member,
      platformAccess,
    });

    if (!canTarget) {
      return {
        assignableRoles: [],
        canChangeRole: false,
        canReactivate: false,
        canRevoke: false,
        canSuspend: false,
      };
    }

    const assignableRoles = canUpdateRole
      ? getAssignablePlatformRoles({
        currentRoleId: member.role?.id,
        platformAccess,
        roles,
      })
      : [];

    return {
      assignableRoles,
      canChangeRole: canUpdateRole && assignableRoles.length > 0,
      canSuspend:
        member.status === PLATFORM_TEAM_MEMBER_STATUS.ACTIVE
        && permissionSet.has(PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND),
      canReactivate:
        member.status === PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED
        && permissionSet.has(PLATFORM_PERMISSION.TEAM_MEMBER_REACTIVATE),
      canRevoke: permissionSet.has(
        PLATFORM_PERMISSION.TEAM_MEMBER_REVOKE,
      ),
    };
  }

  const hasVisibleMemberActions = members.some((member) => {
    const capabilities = getActionCapabilities(member);

    return capabilities.canChangeRole
      || capabilities.canSuspend
      || capabilities.canReactivate
      || capabilities.canRevoke;
  });

  const columns = createPlatformTeamMemberReadColumns({
    currentUserId: currentUser?.id,
    markCurrentUser: true,
  });

  if (hasVisibleMemberActions) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: (member) => {
        const capabilities = getActionCapabilities(member);

        return (
          <DataTableActions>
            {capabilities.canChangeRole && (
              <ActionIconButton
                Icon={Pencil}
                label={`Modifier le rôle de ${formatPlatformTeamMemberName(member)}`}
                onClick={() => openPendingAction('update-role', member)}
                variant="outline"
              />
            )}
            {capabilities.canSuspend && (
              <ActionIconButton
                Icon={Pause}
                label={`Suspendre ${formatPlatformTeamMemberName(member)}`}
                onClick={() => openPendingAction('suspend', member)}
                variant="outline"
              />
            )}
            {capabilities.canReactivate && (
              <ActionIconButton
                Icon={Play}
                label={`Réactiver ${formatPlatformTeamMemberName(member)}`}
                onClick={() => openPendingAction('reactivate', member)}
                variant="outline"
              />
            )}
            {capabilities.canRevoke && (
              <ActionIconButton
                Icon={UserMinus}
                label={`Retirer ${formatPlatformTeamMemberName(member)}`}
                onClick={() => openPendingAction('revoke', member)}
                variant="destructive"
              />
            )}
          </DataTableActions>
        );
      },
    });
  }

  const pendingAssignableRoles = pendingAction?.type === 'update-role'
    ? getAssignablePlatformRoles({
      currentRoleId: pendingAction.member.role?.id,
      platformAccess,
      roles,
    })
    : [];

  return (
    <div className="mt-5">
      <div className="overflow-hidden rounded-lg border border-border">
        <DataTable
          columns={columns}
          data={members}
          getRowKey={(member) => member.id}
        />
      </div>

      <DataPagination
        disabled={membersQuery.isFetching}
        onPageChange={setPage}
        page={page}
        pagination={pagination}
        summary={`${pagination.total} membre${pagination.total > 1 ? 's' : ''}`}
      />

      {pendingAction && (
        <ConfirmationDialog
          confirmLabel={
            pendingAction.type === 'revoke'
              ? 'Retirer'
              : 'Confirmer'
          }
          confirmVariant={
            pendingAction.type === 'revoke'
              ? 'destructive'
              : 'default'
          }
          description={getMemberActionDescription(pendingAction)}
          errorMessage={pendingActionError}
          onCancel={closePendingAction}
          onConfirm={confirmPendingAction}
          pending={mutationPending}
          title={getMemberActionTitle(pendingAction.type)}
        >
          {pendingAction.type === 'update-role' && (
            <div className="mt-4">
              <SelectField
                id="platform-team-member-role"
                label="Nouveau rôle"
                onChange={(event) => setSelectedRoleId(event.target.value)}
                options={pendingAssignableRoles.map((role) => ({
                  label: role.name,
                  value: role.id,
                }))}
                placeholder="Choisissez un rôle"
                value={selectedRoleId}
              />
            </div>
          )}
        </ConfirmationDialog>
      )}
    </div>
  );
}

export {
  PLATFORM_TEAM_MEMBERS_PAGE_SIZE,
  PlatformTeamMembersSection,
  getApiMessage,
  getMemberActionDescription,
  getMemberActionTitle,
  updateMemberRoleSchema,
};
