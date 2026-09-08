import {
  Ban,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useCreateCommercialInvitationMutation,
  useListCommercialInvitationOffersQuery,
  useListCommercialInvitationsQuery,
  useResendCommercialInvitationMutation,
  useRevokeCommercialInvitationMutation,
} from '@/features/commercial-invitation/api/commercial-invitations-api';
import { CommercialInvitationDetailsDrawer } from '@/features/commercial-invitation/components/commercial-invitation-details-drawer';
import { CommercialInvitationForm } from '@/features/commercial-invitation/components/commercial-invitation-form';
import { CommercialInvitationRevokeDialog } from '@/features/commercial-invitation/components/commercial-invitation-revoke-dialog';
import {
  formatCommercialInvitationDate,
  formatCommercialInvitationDeliveryStatus,
  formatCommercialInvitationStatus,
} from '@/features/commercial-invitation/lib/commercial-invitation-formatters';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformCommercialInvitationsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [resendTarget, setResendTarget] = useState(null);
  const [resendError, setResendError] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeError, setRevokeError] = useState(null);

  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const permissionSet = new Set(platformAccess?.permissions ?? []);
  const canCreate = permissionSet.has(
    PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_CREATE,
  );
  const canResend = permissionSet.has(
    PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_RESEND,
  );
  const canRevoke = permissionSet.has(
    PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_REVOKE,
  );

  const invitationsQuery = useListCommercialInvitationsQuery({
    page,
    limit: PAGE_SIZE,
  });
  const offersQuery = useListCommercialInvitationOffersQuery(undefined, {
    skip: !canCreate,
  });
  const [createInvitation, createState] = useCreateCommercialInvitationMutation();
  const [resendInvitation, resendState] = useResendCommercialInvitationMutation();
  const [revokeInvitation, revokeState] = useRevokeCommercialInvitationMutation();

  function openCreateForm() {
    setCreateError(null);
    setSelectedInvitation(null);
    setCreateOpen(true);
  }

  function closeCreateForm() {
    if (createState.isLoading) return;
    setCreateOpen(false);
    setCreateError(null);
  }

  async function submitInvitation(payload) {
    setCreateError(null);

    try {
      await createInvitation(payload).unwrap();
      setCreateOpen(false);
      toast({
        title: 'Invitation commerciale envoyée',
        variant: 'success',
      });
    } catch (error) {
      setCreateError(
        getApiMessage(error, "L’invitation commerciale n’a pas pu être créée."),
      );
    }
  }

  async function confirmResend() {
    if (!resendTarget) return;
    setResendError(null);

    try {
      await resendInvitation(resendTarget.id).unwrap();
      setResendTarget(null);
      toast({
        title: 'Nouveau lien envoyé',
        variant: 'success',
      });
    } catch (error) {
      setResendError(
        getApiMessage(error, "L’invitation n’a pas pu être renvoyée."),
      );
    }
  }

  async function confirmRevoke(reason) {
    if (!revokeTarget) return;
    setRevokeError(null);

    try {
      await revokeInvitation({
        invitationId: revokeTarget.id,
        reason,
      }).unwrap();
      setRevokeTarget(null);
      toast({
        title: 'Invitation révoquée',
        variant: 'success',
      });
    } catch (error) {
      setRevokeError(
        getApiMessage(error, "L’invitation n’a pas pu être révoquée."),
      );
    }
  }

  if (invitationsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des invitations commerciales…
      </p>
    );
  }

  if (invitationsQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Invitations commerciales</h1>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les invitations commerciales.
        </p>
        <Button
          onClick={invitationsQuery.refetch}
          type="button"
          variant="outline"
        >
          Réessayer
        </Button>
      </section>
    );
  }

  const invitations = invitationsQuery.data?.invitations ?? [];
  const columns = [
    {
      id: 'beneficiary',
      header: 'Bénéficiaire',
      cell: (invitation) => (
        <div className="space-y-1">
          <p className="font-medium">{invitation.email}</p>
          <p className="text-xs text-muted-foreground">
            {invitation.workspaceName}
          </p>
        </div>
      ),
    },
    {
      id: 'offer',
      header: 'Offre privée',
      cell: (invitation) => invitation.offer?.planName
        ?? invitation.plan?.name
        ?? '—',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (invitation) => formatCommercialInvitationStatus(
        invitation.status,
      ),
    },
    {
      id: 'delivery',
      header: 'Email',
      cell: (invitation) => formatCommercialInvitationDeliveryStatus(
        invitation.deliveryStatus,
      ),
    },
    {
      id: 'expiresAt',
      header: 'Expiration',
      cell: (invitation) => formatCommercialInvitationDate(
        invitation.expiresAt,
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (invitation) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label="Voir les détails de l’invitation"
            onClick={() => setSelectedInvitation(invitation)}
            variant="outline"
          />
          {canResend && invitation.status === 'pending' && (
            <ActionIconButton
              Icon={RefreshCw}
              label="Renvoyer l’invitation"
              onClick={() => {
                setResendError(null);
                setSelectedInvitation(null);
                setResendTarget(invitation);
              }}
              variant="outline"
            />
          )}
          {canRevoke && invitation.status === 'pending' && (
            <ActionIconButton
              Icon={Ban}
              label="Révoquer l’invitation"
              onClick={() => {
                setRevokeError(null);
                setSelectedInvitation(null);
                setRevokeTarget(invitation);
              }}
              variant="outline"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invitations commerciales
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Proposez une offre privée à un futur client ou bêta-testeur. Le premier workspace est créé uniquement après authentification et acceptation du bénéficiaire.
          </p>
        </div>

        {canCreate && (
          <Button
            disabled={offersQuery.isLoading || Boolean(offersQuery.error)}
            onClick={openCreateForm}
            type="button"
          >
            <Plus aria-hidden="true" />
            Nouvelle invitation
          </Button>
        )}
      </div>

      {canCreate && offersQuery.error && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 p-3">
          <p className="text-sm text-destructive" role="alert">
            Le catalogue des offres privées n’est pas disponible. La création d’invitation est désactivée.
          </p>
          <Button
            onClick={offersQuery.refetch}
            type="button"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Historique des propositions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {invitationsQuery.data?.pagination?.total ?? 0} invitation(s)
          </p>
        </div>

        {invitations.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Aucune invitation commerciale.
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={invitations}
            getRowKey={(invitation) => invitation.id}
          />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            disabled={invitationsQuery.isFetching}
            onPageChange={setPage}
            page={page}
            pagination={invitationsQuery.data?.pagination}
          />
        </div>
      </section>

      <CommercialInvitationDetailsDrawer
        invitation={selectedInvitation}
        onClose={() => setSelectedInvitation(null)}
      />

      <EntityDetailsDrawer
        description="Sélectionnez une offre privée existante. Les droits, limites et conditions contractuelles restent dérivés et contrôlés par le backend."
        onClose={closeCreateForm}
        open={createOpen}
        title="Nouvelle invitation commerciale"
      >
        {createOpen && (
          <CommercialInvitationForm
            onCancel={closeCreateForm}
            onSubmit={submitInvitation}
            pending={createState.isLoading}
            plans={offersQuery.data ?? []}
            submitError={createError}
          />
        )}
      </EntityDetailsDrawer>

      <ConfirmationDialog
        confirmLabel="Renvoyer"
        description={resendTarget
          ? `Un nouveau lien sera envoyé à ${resendTarget.email}. L’ancien lien deviendra immédiatement inutilisable.`
          : ''}
        errorMessage={resendError}
        onCancel={() => {
          if (!resendState.isLoading) {
            setResendTarget(null);
            setResendError(null);
          }
        }}
        onConfirm={confirmResend}
        open={Boolean(resendTarget)}
        pending={resendState.isLoading}
        pendingLabel="Envoi…"
        title="Renvoyer l’invitation ?"
      />

      <CommercialInvitationRevokeDialog
        errorMessage={revokeError}
        invitation={revokeTarget}
        onCancel={() => {
          if (!revokeState.isLoading) {
            setRevokeTarget(null);
            setRevokeError(null);
          }
        }}
        onConfirm={confirmRevoke}
        pending={revokeState.isLoading}
      />
    </div>
  );
}

export { PlatformCommercialInvitationsPage };
