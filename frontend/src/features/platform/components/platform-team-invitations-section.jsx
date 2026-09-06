import { MailPlus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  useListPlatformTeamInvitationsQuery,
  useResendPlatformTeamInvitationMutation,
  useRevokePlatformTeamInvitationMutation,
} from '@/features/platform/api/platform-invitations-api';
import { PlatformInvitationDeliveryBadge } from '@/features/platform/components/platform-invitation-delivery-badge';
import { PlatformInvitationFormDrawer } from '@/features/platform/components/platform-invitation-form-drawer';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const PLATFORM_TEAM_INVITATIONS_PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatInvitationRecipient(invitation) {
  return [invitation?.firstName, invitation?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || invitation?.email || 'Invité';
}

function formatInvitationDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformTeamInvitationsSection() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const permissionSet = new Set(platformAccess?.permissions ?? []);
  const canInvite = permissionSet.has(PLATFORM_PERMISSION.TEAM_INVITE);
  const canResend = permissionSet.has(
    PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
  );
  const canRevoke = permissionSet.has(
    PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
  );

  const invitationsQuery = useListPlatformTeamInvitationsQuery({
    page,
    limit: PLATFORM_TEAM_INVITATIONS_PAGE_SIZE,
  });
  const [resendInvitation, resendState] =
    useResendPlatformTeamInvitationMutation();
  const [revokeInvitation, revokeState] =
    useRevokePlatformTeamInvitationMutation();

  const invitations = invitationsQuery.data?.invitations ?? [];
  const pagination = invitationsQuery.data?.pagination ?? {
    page,
    limit: PLATFORM_TEAM_INVITATIONS_PAGE_SIZE,
    total: invitations.length,
    totalPages: invitations.length > 0 ? 1 : 0,
  };
  const mutationPending = resendState.isLoading || revokeState.isLoading;

  const columns = useMemo(() => {
    const baseColumns = [
      {
        id: 'recipient',
        header: 'Destinataire',
        cell: (invitation) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {formatInvitationRecipient(invitation)}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {invitation.email}
            </p>
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Rôle prévu',
        cell: (invitation) => invitation.role?.name ?? '—',
      },
      {
        id: 'delivery',
        header: 'Envoi',
        cell: (invitation) => (
          <PlatformInvitationDeliveryBadge
            status={invitation.deliveryStatus}
          />
        ),
      },
      {
        id: 'expiresAt',
        header: 'Expiration',
        cell: (invitation) => formatInvitationDate(invitation.expiresAt),
      },
    ];

    if (!canResend && !canRevoke) return baseColumns;

    return [
      ...baseColumns,
      {
        id: 'actions',
        header: 'Actions',
        headerClassName: 'w-px whitespace-nowrap text-right',
        cellClassName: 'w-px whitespace-nowrap text-right',
        cell: (invitation) => (
          <DataTableActions className="justify-end">
            {canResend && (
              <ActionIconButton
                Icon={RefreshCw}
                label={`Renvoyer l’invitation à ${formatInvitationRecipient(invitation)}`}
                onClick={() => {
                  setActionError(null);
                  setPendingAction({ type: 'resend', invitation });
                }}
                variant="ghost"
              />
            )}
            {canRevoke && (
              <ActionIconButton
                Icon={Trash2}
                label={`Révoquer l’invitation de ${formatInvitationRecipient(invitation)}`}
                onClick={() => {
                  setActionError(null);
                  setPendingAction({ type: 'revoke', invitation });
                }}
                variant="ghost"
              />
            )}
          </DataTableActions>
        ),
      },
    ];
  }, [canResend, canRevoke]);

  async function confirmAction() {
    if (!pendingAction?.invitation) return;

    setActionError(null);
    const { invitation, type } = pendingAction;

    try {
      if (type === 'resend') {
        await resendInvitation(invitation.id).unwrap();
        toast({
          title: 'Invitation renvoyée',
          description: `Un nouveau lien a été envoyé à ${invitation.email}.`,
        });
      } else if (type === 'revoke') {
        await revokeInvitation(invitation.id).unwrap();
        toast({
          title: 'Invitation révoquée',
          description: `${formatInvitationRecipient(invitation)} ne peut plus utiliser cette invitation.`,
        });
      }

      setPendingAction(null);
    } catch (error) {
      setActionError(getApiMessage(
        error,
        type === 'resend'
          ? 'Impossible de renvoyer cette invitation.'
          : 'Impossible de révoquer cette invitation.',
      ));
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Seules les invitations encore actives sont affichées.
        </p>

        {canInvite && (
          <Button onClick={() => setCreateOpen(true)} type="button">
            <MailPlus aria-hidden="true" className="size-4" />
            Inviter un membre
          </Button>
        )}
      </div>

      {invitationsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">
          Chargement des invitations…
        </p>
      )}

      {invitationsQuery.isError && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger les invitations en attente.
          </p>
          <Button
            onClick={invitationsQuery.refetch}
            type="button"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      )}

      {!invitationsQuery.isLoading
        && !invitationsQuery.isError
        && invitations.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            Aucune invitation active.
          </p>
      )}

      {!invitationsQuery.isLoading
        && !invitationsQuery.isError
        && invitations.length > 0 && (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <DataTable
                columns={columns}
                data={invitations}
                getRowKey={(invitation) => invitation.id}
              />
            </div>

            <DataPagination
              disabled={invitationsQuery.isFetching}
              onPageChange={setPage}
              page={page}
              pagination={pagination}
              summary={`${pagination.total} invitation${pagination.total > 1 ? 's' : ''}`}
            />
          </>
      )}

      <PlatformInvitationFormDrawer
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        platformAccess={platformAccess}
      />

      <ConfirmationDialog
        confirmLabel={pendingAction?.type === 'resend' ? 'Renvoyer' : 'Révoquer'}
        confirmVariant={pendingAction?.type === 'resend' ? 'default' : 'destructive'}
        description={pendingAction?.type === 'resend'
          ? `Renvoyer un nouveau lien à ${pendingAction?.invitation?.email ?? ''} ? L’ancien lien deviendra inutilisable.`
          : `Révoquer l’invitation envoyée à ${pendingAction?.invitation?.email ?? ''} ? Cette action empêchera son acceptation.`}
        errorMessage={actionError}
        onCancel={() => {
          if (mutationPending) return;
          setPendingAction(null);
          setActionError(null);
        }}
        onConfirm={confirmAction}
        open={Boolean(pendingAction)}
        pending={mutationPending}
        pendingLabel={pendingAction?.type === 'resend' ? 'Renvoi…' : 'Révocation…'}
        title={pendingAction?.type === 'resend'
          ? 'Renvoyer l’invitation'
          : 'Révoquer l’invitation'}
      />
    </div>
  );
}

export {
  PLATFORM_TEAM_INVITATIONS_PAGE_SIZE,
  PlatformTeamInvitationsSection,
  formatInvitationDate,
  formatInvitationRecipient,
};
