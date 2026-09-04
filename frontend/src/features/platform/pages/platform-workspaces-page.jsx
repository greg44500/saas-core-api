import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useGetPlatformWorkspaceQuery,
  useListPlatformWorkspacesQuery,
  useReactivatePlatformWorkspaceMutation,
  useSuspendPlatformWorkspaceMutation,
} from '@/features/platform/api/platform-workspaces-api';
import { PlatformWorkspaceDetailsDrawer } from '@/features/platform/components/platform-workspace-details-drawer';
import {
  PLATFORM_WORKSPACE_STATUS_REASON,
  PLATFORM_WORKSPACE_STATUS_REASON_LABEL,
  formatPlatformWorkspaceDate,
  formatPlatformWorkspaceStatus,
  formatPlatformWorkspaceStatusReason,
} from '@/features/platform/lib/platform-workspace-formatters';

const PAGE_SIZE = 20;

const suspendWorkspaceSchema = z
  .strictObject({
    statusReason: z.enum(Object.values(PLATFORM_WORKSPACE_STATUS_REASON)),
    statusReasonDetails: z.string().trim().min(3, 'Les détails doivent contenir au minimum 3 caractères.').max(500).optional(),
  })
  .superRefine((data, context) => {
    if (
      data.statusReason === PLATFORM_WORKSPACE_STATUS_REASON.OTHER
      && !data.statusReasonDetails
    ) {
      context.addIssue({
        code: 'custom',
        path: ['statusReasonDetails'],
        message: 'Précisez le motif en au moins 3 caractères.',
      });
    }
  });

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformWorkspacesPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionError, setPendingActionError] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusReasonDetails, setStatusReasonDetails] = useState('');
  const selectedWorkspaceId = searchParams.get('workspaceId');

  const workspacesQuery = useListPlatformWorkspacesQuery({ page, limit: PAGE_SIZE });
  const workspaceDetailsQuery = useGetPlatformWorkspaceQuery(selectedWorkspaceId, {
    skip: !selectedWorkspaceId,
  });
  const [suspendWorkspace, suspendState] = useSuspendPlatformWorkspaceMutation();
  const [reactivateWorkspace, reactivateState] = useReactivatePlatformWorkspaceMutation();
  const mutationPending = suspendState.isLoading || reactivateState.isLoading;

  function selectWorkspace(workspaceId) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('workspaceId', workspaceId);
      return next;
    });
  }

  function closeWorkspaceDetails() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('workspaceId');
      return next;
    });
  }

  function openPendingAction(action) {
    setPendingActionError(null);
    setStatusReason('');
    setStatusReasonDetails('');
    setPendingAction(action);
  }

  function closePendingAction() {
    if (mutationPending) return;
    setPendingAction(null);
    setPendingActionError(null);
    setStatusReason('');
    setStatusReasonDetails('');
  }

  async function confirmPendingAction() {
    if (!pendingAction?.workspace) return;

    setPendingActionError(null);

    try {
      if (pendingAction.type === 'suspend') {
        const validation = suspendWorkspaceSchema.safeParse({
          statusReason,
          statusReasonDetails: statusReasonDetails.trim() || undefined,
        });

        if (!validation.success) {
          setPendingActionError(validation.error.issues[0]?.message ?? 'Motif invalide.');
          return;
        }

        await suspendWorkspace({
          workspaceId: pendingAction.workspace.id,
          statusReason: validation.data.statusReason,
          statusReasonDetails: validation.data.statusReasonDetails,
        }).unwrap();

        toast({ title: 'Workspace suspendu', variant: 'success' });
      }

      if (pendingAction.type === 'reactivate') {
        await reactivateWorkspace(pendingAction.workspace.id).unwrap();
        toast({ title: 'Workspace réactivé', variant: 'success' });
      }

      setPendingAction(null);
      setStatusReason('');
      setStatusReasonDetails('');
    } catch (error) {
      setPendingActionError(
        getApiMessage(error, "L’action d’administration n’a pas pu être effectuée."),
      );
    }
  }

  if (workspacesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des workspaces…</p>;
  }

  if (workspacesQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les workspaces de la plateforme.
        </p>
        <Button onClick={workspacesQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  const workspaces = workspacesQuery.data?.workspaces ?? [];
  const columns = [
    { id: 'name', header: 'Workspace', cell: (workspace) => workspace.name },
    {
      id: 'status',
      header: 'Statut',
      cell: (workspace) => formatPlatformWorkspaceStatus(workspace.status),
    },
    {
      id: 'reason',
      header: 'Motif',
      cell: (workspace) => formatPlatformWorkspaceStatusReason(workspace.statusReason),
    },
    {
      id: 'statusChangedAt',
      header: 'Statut modifié le',
      cell: (workspace) => formatPlatformWorkspaceDate(workspace.statusChangedAt),
    },
    {
      id: 'createdAt',
      header: 'Créé le',
      cell: (workspace) => formatPlatformWorkspaceDate(workspace.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (workspace) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label="Voir"
            onClick={() => selectWorkspace(workspace.id)}
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez les workspaces et appliquez les transitions administratives exposées par la plateforme.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Workspaces de la plateforme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspacesQuery.data?.pagination?.total ?? 0} workspace(s)
          </p>
        </div>

        {workspaces.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucun workspace.</p>
        ) : (
          <DataTable columns={columns} data={workspaces} getRowKey={(workspace) => workspace.id} />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            disabled={workspacesQuery.isFetching}
            onPageChange={setPage}
            page={page}
            pagination={workspacesQuery.data?.pagination}
          />
        </div>
      </section>

      <PlatformWorkspaceDetailsDrawer
        error={workspaceDetailsQuery.error}
        isLoading={workspaceDetailsQuery.isLoading || workspaceDetailsQuery.isFetching}
        onClose={closeWorkspaceDetails}
        onRequestAction={openPendingAction}
        onRetry={workspaceDetailsQuery.refetch}
        open={Boolean(selectedWorkspaceId)}
        workspace={workspaceDetailsQuery.data}
      />

      <ConfirmationDialog
        confirmVariant={pendingAction?.type === 'suspend' ? 'destructive' : 'default'}
        description={
          pendingAction?.type === 'suspend'
            ? `Suspendre ${pendingAction.workspace.name} ? Le workspace restera conservé mais son utilisation sera bloquée.`
            : pendingAction?.type === 'reactivate'
              ? `Réactiver ${pendingAction.workspace.name} ?`
              : ''
        }
        errorMessage={pendingActionError}
        onCancel={closePendingAction}
        onConfirm={confirmPendingAction}
        open={Boolean(pendingAction)}
        pending={mutationPending}
        title="Confirmer l’action"
      >
        {pendingAction?.type === 'suspend' && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="platform-workspace-status-reason">
                Motif de suspension
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="platform-workspace-status-reason"
                onChange={(event) => setStatusReason(event.target.value)}
                value={statusReason}
              >
                <option value="">Choisir un motif</option>
                {Object.values(PLATFORM_WORKSPACE_STATUS_REASON).map((reason) => (
                  <option key={reason} value={reason}>
                    {PLATFORM_WORKSPACE_STATUS_REASON_LABEL[reason] ?? reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="platform-workspace-status-reason-details">
                Détails du motif
              </label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="platform-workspace-status-reason-details"
                maxLength={500}
                onChange={(event) => setStatusReasonDetails(event.target.value)}
                placeholder="Précisez le contexte si nécessaire"
                value={statusReasonDetails}
              />
            </div>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}

export { PlatformWorkspacesPage };
