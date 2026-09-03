import { useState } from 'react';
import { Eye, Plus } from 'lucide-react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { useListPlatformPlansQuery } from '@/features/platform/api/platform-plans-api';
import {
  useCancelPlatformSubscriptionMutation,
  useGetPlatformSubscriptionQuery,
  useGrantPlatformSubscriptionTrialMutation,
  useListPlatformSubscriptionsQuery,
  useResumePlatformSubscriptionMutation,
  useUpdatePlatformSubscriptionMutation,
} from '@/features/platform/api/platform-subscriptions-api';
import { useListPlatformWorkspacesQuery } from '@/features/platform/api/platform-workspaces-api';
import { PlatformSubscriptionDetailsDrawer } from '@/features/platform/components/platform-subscription-details-drawer';
import { PlatformSubscriptionEditForm } from '@/features/platform/components/platform-subscription-edit-form';
import { PlatformSubscriptionGrantTrialForm } from '@/features/platform/components/platform-subscription-grant-trial-form';
import {
  formatPlatformSubscriptionBillingInterval,
  formatPlatformSubscriptionDate,
  formatPlatformSubscriptionPrice,
  formatPlatformSubscriptionStatus,
} from '@/features/platform/lib/platform-subscription-formatters';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformSubscriptionsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState(null);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialError, setTrialError] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelMode, setCancelMode] = useState('period_end');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState(null);
  const [resumeTarget, setResumeTarget] = useState(null);
  const [resumeError, setResumeError] = useState(null);

  const listQuery = useListPlatformSubscriptionsQuery({ page, limit: PAGE_SIZE });
  const detailQuery = useGetPlatformSubscriptionQuery(selectedId, { skip: !selectedId });
  const plansQuery = useListPlatformPlansQuery({ page: 1, limit: 100 });
  const workspacesQuery = useListPlatformWorkspacesQuery({ page: 1, limit: 100 });

  const [updateSubscription, updateState] = useUpdatePlatformSubscriptionMutation();
  const [cancelSubscription, cancelState] = useCancelPlatformSubscriptionMutation();
  const [resumeSubscription, resumeState] = useResumePlatformSubscriptionMutation();
  const [grantTrial, trialState] = useGrantPlatformSubscriptionTrialMutation();

  const subscriptions = listQuery.data?.subscriptions ?? [];
  const plans = plansQuery.data?.plans ?? [];
  const workspaces = workspacesQuery.data?.workspaces ?? [];

  function closeDetail() {
    setSelectedId(null);
    setEditOpen(false);
    setEditError(null);
  }

  async function submitEdit(payload) {
    if (!selectedId) return;
    setEditError(null);
    try {
      await updateSubscription({ subscriptionId: selectedId, ...payload }).unwrap();
      toast({ title: 'Souscription mise à jour', variant: 'success' });
      setEditOpen(false);
    } catch (error) {
      setEditError(getApiMessage(error, "La souscription n’a pas pu être mise à jour."));
    }
  }

  async function submitTrial(payload) {
    setTrialError(null);
    try {
      await grantTrial(payload).unwrap();
      toast({ title: 'Trial accordé', variant: 'success' });
      setTrialOpen(false);
    } catch (error) {
      setTrialError(getApiMessage(error, "Le trial n’a pas pu être accordé."));
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError('Le motif de l’annulation est obligatoire.');
      return;
    }

    setCancelError(null);
    try {
      await cancelSubscription({
        subscriptionId: cancelTarget.id,
        mode: cancelMode,
        reason,
      }).unwrap();
      toast({ title: 'Annulation enregistrée', variant: 'success' });
      setCancelTarget(null);
      setCancelReason('');
    } catch (error) {
      setCancelError(getApiMessage(error, "L’annulation n’a pas pu être enregistrée."));
    }
  }

  async function confirmResume() {
    if (!resumeTarget) return;
    setResumeError(null);
    try {
      await resumeSubscription(resumeTarget.id).unwrap();
      toast({ title: 'Annulation programmée retirée', variant: 'success' });
      setResumeTarget(null);
    } catch (error) {
      setResumeError(getApiMessage(error, "La souscription n’a pas pu être reprise."));
    }
  }

  if (listQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des souscriptions…</p>;
  }

  if (listQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Abonnements</h1>
        <p className="text-sm text-destructive" role="alert">Impossible de charger les souscriptions de la plateforme.</p>
        <Button onClick={listQuery.refetch} type="button" variant="outline">Réessayer</Button>
      </section>
    );
  }

  const columns = [
    {
      id: 'workspace',
      header: 'Workspace',
      cell: (subscription) => subscription.workspace?.name ?? 'Workspace indisponible',
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: (subscription) => subscription.plan?.name ?? 'Plan indisponible',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (subscription) => formatPlatformSubscriptionStatus(subscription.status),
    },
    {
      id: 'billing',
      header: 'Périodicité',
      cell: (subscription) => formatPlatformSubscriptionBillingInterval(subscription.billingInterval),
    },
    {
      id: 'price',
      header: 'Prix HT',
      cell: (subscription) => formatPlatformSubscriptionPrice(subscription.priceExclTaxMinor, subscription.currency),
    },
    {
      id: 'trial',
      header: 'Fin du trial',
      cell: (subscription) => formatPlatformSubscriptionDate(subscription.trialEndsAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (subscription) => (
        <DataTableActions>
          <ActionIconButton Icon={Eye} label="Voir" onClick={() => setSelectedId(subscription.id)} variant="outline" />
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Abonnements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrez les souscriptions commerciales, trials, remises et transitions de cycle de vie.
          </p>
        </div>
        <Button
          disabled={plansQuery.isLoading || workspacesQuery.isLoading || Boolean(plansQuery.error) || Boolean(workspacesQuery.error)}
          onClick={() => {
            setTrialError(null);
            setTrialOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" />
          Accorder un trial
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Souscriptions Platform</h2>
          <p className="mt-1 text-sm text-muted-foreground">{listQuery.data?.pagination?.total ?? 0} souscription(s)</p>
        </div>

        {subscriptions.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucune souscription.</p>
        ) : (
          <DataTable columns={columns} data={subscriptions} getRowKey={(subscription) => subscription.id} />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            disabled={listQuery.isFetching}
            onPageChange={setPage}
            page={page}
            pagination={listQuery.data?.pagination}
          />
        </div>
      </section>

      <PlatformSubscriptionDetailsDrawer
        error={detailQuery.error}
        isLoading={detailQuery.isLoading || detailQuery.isFetching}
        onCancel={(subscription) => {
          setSelectedId(null);
          setCancelError(null);
          setCancelMode('period_end');
          setCancelReason('');
          setCancelTarget(subscription);
        }}
        onClose={closeDetail}
        onEdit={() => {
          setEditError(null);
          setEditOpen(true);
        }}
        onResume={(subscription) => {
          setSelectedId(null);
          setResumeError(null);
          setResumeTarget(subscription);
        }}
        onRetry={detailQuery.refetch}
        open={Boolean(selectedId) && !editOpen}
        subscription={detailQuery.data}
      />

      <EntityDetailsDrawer
        description="Modifiez les paramètres commerciaux autorisés. Le backend reste l’autorité sur les invariants de plan, prix, remise et dérogation."
        onClose={() => {
          if (!updateState.isLoading) setEditOpen(false);
        }}
        open={editOpen}
        title="Modifier la souscription"
      >
        {detailQuery.data && (
          <PlatformSubscriptionEditForm
            onCancel={() => setEditOpen(false)}
            onSubmit={submitEdit}
            pending={updateState.isLoading}
            plans={plans}
            subscription={detailQuery.data}
            submitError={editError}
          />
        )}
      </EntityDetailsDrawer>

      <EntityDetailsDrawer
        description="Accord administratif d’un trial sur un plan actif explicitement éligible. L’éligibilité réelle reste contrôlée par le backend."
        onClose={() => {
          if (!trialState.isLoading) setTrialOpen(false);
        }}
        open={trialOpen}
        title="Accorder un trial"
      >
        <PlatformSubscriptionGrantTrialForm
          onCancel={() => setTrialOpen(false)}
          onSubmit={submitTrial}
          pending={trialState.isLoading}
          plans={plans}
          submitError={trialError}
          workspaces={workspaces}
        />
      </EntityDetailsDrawer>

      <ConfirmationDialog
        description={cancelTarget ? `Annuler la souscription du workspace ${cancelTarget.workspace?.name ?? ''} ?` : ''}
        errorMessage={cancelError}
        onCancel={() => {
          if (!cancelState.isLoading) setCancelTarget(null);
        }}
        onConfirm={confirmCancel}
        open={Boolean(cancelTarget)}
        pending={cancelState.isLoading}
        title="Annuler la souscription"
      >
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cancel-mode">Prise d’effet</label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" id="cancel-mode" onChange={(event) => setCancelMode(event.target.value)} value={cancelMode}>
              <option value="period_end">Fin de période</option>
              <option value="immediate">Immédiate</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cancel-reason">Motif</label>
            <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" id="cancel-reason" maxLength={500} onChange={(event) => setCancelReason(event.target.value)} value={cancelReason} />
          </div>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        confirmLabel="Reprendre"
        confirmVariant="default"
        description={resumeTarget ? `Retirer l’annulation programmée de ${resumeTarget.workspace?.name ?? 'ce workspace'} ?` : ''}
        errorMessage={resumeError}
        onCancel={() => {
          if (!resumeState.isLoading) setResumeTarget(null);
        }}
        onConfirm={confirmResume}
        open={Boolean(resumeTarget)}
        pending={resumeState.isLoading}
        title="Reprendre la souscription"
      />
    </div>
  );
}

export { PlatformSubscriptionsPage };
