import { useState } from 'react';
import { Eye } from 'lucide-react';
import { z } from 'zod';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { useGetCurrentUserQuery } from '@/features/auth/api/auth-api';
import {
  useDisablePlatformUserMutation,
  useEnablePlatformUserMutation,
  useGetPlatformUserQuery,
  useListPlatformUsersQuery,
  useRevokePlatformUserSessionsMutation,
} from '@/features/platform/api/platform-users-api';
import { PlatformUserDetailsDrawer } from '@/features/platform/components/platform-user-details-drawer';
import {
  formatPlatformUserDate,
  formatPlatformUserName,
  formatPlatformUserStatus,
} from '@/features/platform/lib/platform-user-formatters';

const PAGE_SIZE = 20;

const disableUserSchema = z.strictObject({
  disabledReason: z
    .string()
    .trim()
    .min(3, 'Le motif doit contenir au minimum 3 caractères.')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères.'),
});

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function getActionDescription(action) {
  if (!action?.user) return '';

  const userName = formatPlatformUserName(action.user);

  if (action.type === 'disable') {
    return `Désactiver ${userName} ? Ses sessions actives seront révoquées.`;
  }

  if (action.type === 'enable') {
    return `Réactiver le compte de ${userName} ?`;
  }

  if (action.type === 'revoke-sessions') {
    return `Révoquer toutes les sessions actives de ${userName} ?`;
  }

  return '';
}

function PlatformUsersPage() {
  const { toast } = useToast();
  const { data: currentUser } = useGetCurrentUserQuery();
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionError, setPendingActionError] = useState(null);
  const [disabledReason, setDisabledReason] = useState('');

  const usersQuery = useListPlatformUsersQuery({ page, limit: PAGE_SIZE });
  const userDetailsQuery = useGetPlatformUserQuery(selectedUserId, {
    skip: !selectedUserId,
  });

  const [disableUser, disableUserState] = useDisablePlatformUserMutation();
  const [enableUser, enableUserState] = useEnablePlatformUserMutation();
  const [revokeUserSessions, revokeSessionsState] = useRevokePlatformUserSessionsMutation();

  const mutationPending =
    disableUserState.isLoading ||
    enableUserState.isLoading ||
    revokeSessionsState.isLoading;

  function openPendingAction(action) {
    setPendingActionError(null);
    setDisabledReason('');
    setPendingAction(action);
  }

  function closePendingAction() {
    if (mutationPending) return;

    setPendingAction(null);
    setPendingActionError(null);
    setDisabledReason('');
  }

  async function confirmPendingAction() {
    if (!pendingAction?.user) return;

    setPendingActionError(null);

    try {
      if (pendingAction.type === 'disable') {
        const validation = disableUserSchema.safeParse({ disabledReason });

        if (!validation.success) {
          setPendingActionError(validation.error.issues[0]?.message ?? 'Motif invalide.');
          return;
        }

        await disableUser({
          userId: pendingAction.user.id,
          disabledReason: validation.data.disabledReason,
        }).unwrap();

        toast({
          title: 'Utilisateur désactivé',
          description: 'Ses sessions actives ont été révoquées.',
          variant: 'success',
        });
      }

      if (pendingAction.type === 'enable') {
        await enableUser(pendingAction.user.id).unwrap();
        toast({ title: 'Utilisateur réactivé', variant: 'success' });
      }

      if (pendingAction.type === 'revoke-sessions') {
        const result = await revokeUserSessions(pendingAction.user.id).unwrap();
        const revokedSessionCount = result?.revokedSessionCount ?? 0;

        toast({
          title: 'Sessions révoquées',
          description: `${revokedSessionCount} session${revokedSessionCount > 1 ? 's' : ''} révoquée${revokedSessionCount > 1 ? 's' : ''}.`,
          variant: 'success',
        });
      }

      setPendingAction(null);
      setDisabledReason('');
    } catch (error) {
      setPendingActionError(
        getApiMessage(error, "L’action d’administration n’a pas pu être effectuée."),
      );
    }
  }

  if (usersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des utilisateurs…</p>;
  }

  if (usersQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Utilisateurs</h1>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les utilisateurs de la plateforme.
        </p>
        <Button onClick={usersQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  const users = usersQuery.data?.users ?? [];
  const userColumns = [
    {
      id: 'user',
      header: 'Utilisateur',
      cell: (user) => (
        <div>
          <p className="font-medium">
            {formatPlatformUserName(user)}
            {user.id === currentUser?.id ? ' (vous)' : ''}
          </p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (user) => formatPlatformUserStatus(user.status),
    },
    {
      id: 'lastLoginAt',
      header: 'Dernière connexion',
      cell: (user) => formatPlatformUserDate(user.lastLoginAt),
    },
    {
      id: 'createdAt',
      header: 'Créé le',
      cell: (user) => formatPlatformUserDate(user.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (user) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label="Voir"
            onClick={() => setSelectedUserId(user.id)}
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez les comptes de la plateforme et appliquez les opérations autorisées par vos permissions Platform.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Comptes de la plateforme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {usersQuery.data?.pagination?.total ?? 0} utilisateur(s)
          </p>
        </div>

        {users.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucun utilisateur.</p>
        ) : (
          <DataTable
            columns={userColumns}
            data={users}
            getRowKey={(user) => user.id}
          />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            disabled={usersQuery.isFetching}
            onPageChange={setPage}
            page={page}
            pagination={usersQuery.data?.pagination}
          />
        </div>
      </section>

      <PlatformUserDetailsDrawer
        currentUserId={currentUser?.id ?? null}
        error={userDetailsQuery.error}
        isLoading={userDetailsQuery.isLoading || userDetailsQuery.isFetching}
        onClose={() => setSelectedUserId(null)}
        onRequestAction={openPendingAction}
        onRetry={userDetailsQuery.refetch}
        open={Boolean(selectedUserId)}
        user={userDetailsQuery.data}
      />

      <ConfirmationDialog
        confirmLabel="Confirmer"
        confirmVariant={pendingAction?.type === 'disable' ? 'destructive' : 'default'}
        description={getActionDescription(pendingAction)}
        errorMessage={pendingActionError}
        onCancel={closePendingAction}
        onConfirm={confirmPendingAction}
        open={Boolean(pendingAction)}
        pending={mutationPending}
        title="Confirmer l’action"
      >
        {pendingAction?.type === 'disable' && (
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-user-disable-reason">
              Motif de désactivation
            </label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="platform-user-disable-reason"
              maxLength={500}
              onChange={(event) => setDisabledReason(event.target.value)}
              placeholder="Indiquez le motif administratif"
              value={disabledReason}
            />
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}

export { PlatformUsersPage };
