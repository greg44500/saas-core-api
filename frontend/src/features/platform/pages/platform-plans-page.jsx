import { useState } from 'react';
import { Eye, Plus } from 'lucide-react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useArchivePlatformPlanMutation,
  useCreatePlatformPlanMutation,
  useListPlatformPlanCapabilitiesQuery,
  useListPlatformPlansQuery,
  useUpdatePlatformPlanMutation,
} from '@/features/platform/api/platform-plans-api';
import { PlatformPlanDetailsDrawer } from '@/features/platform/components/platform-plan-details-drawer';
import { PlatformPlanForm } from '@/features/platform/components/platform-plan-form';
import {
  formatPlatformPlanPrice,
  formatPlatformPlanStatus,
} from '@/features/platform/lib/platform-plan-formatters';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformPlansPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formState, setFormState] = useState(null);
  const [formError, setFormError] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveError, setArchiveError] = useState(null);

  const plansQuery = useListPlatformPlansQuery({ page, limit: PAGE_SIZE });
  const capabilitiesQuery = useListPlatformPlanCapabilitiesQuery();
  const [createPlan, createState] = useCreatePlatformPlanMutation();
  const [updatePlan, updateState] = useUpdatePlatformPlanMutation();
  const [archivePlan, archiveState] = useArchivePlatformPlanMutation();

  const formPending = createState.isLoading || updateState.isLoading;

  function openCreateForm() {
    setFormError(null);
    setSelectedPlan(null);
    setFormState({ mode: 'create', plan: null });
  }

  function openEditForm(plan) {
    setFormError(null);
    setSelectedPlan(null);
    setFormState({ mode: 'edit', plan });
  }

  function closeForm() {
    if (formPending) return;
    setFormState(null);
    setFormError(null);
  }

  async function submitPlan(payload) {
    setFormError(null);

    try {
      if (formState?.mode === 'create') {
        await createPlan(payload).unwrap();
        toast({ title: 'Plan créé', variant: 'success' });
      } else if (formState?.mode === 'edit' && formState.plan) {
        await updatePlan({
          planId: formState.plan.id,
          ...payload,
        }).unwrap();
        toast({ title: 'Plan mis à jour', variant: 'success' });
      } else {
        return;
      }

      setFormState(null);
    } catch (error) {
      setFormError(
        getApiMessage(error, "Le plan n’a pas pu être enregistré."),
      );
    }
  }

  function requestArchive(plan) {
    setArchiveError(null);
    setSelectedPlan(null);
    setArchiveTarget(plan);
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiveError(null);

    try {
      await archivePlan(archiveTarget.id).unwrap();
      toast({ title: 'Plan archivé', variant: 'success' });
      setArchiveTarget(null);
    } catch (error) {
      setArchiveError(
        getApiMessage(error, "Le plan n’a pas pu être archivé."),
      );
    }
  }

  if (plansQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des plans…</p>;
  }

  if (plansQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les plans de la plateforme.
        </p>
        <Button onClick={plansQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  const plans = plansQuery.data?.plans ?? [];
  const columns = [
    {
      id: 'plan',
      header: 'Plan',
      cell: (plan) => (
        <div>
          <p className="font-medium">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.key}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (plan) => formatPlatformPlanStatus(plan.status),
    },
    {
      id: 'public',
      header: 'Catalogue',
      cell: (plan) => (plan.isPublic ? 'Public' : 'Privé'),
    },
    {
      id: 'price',
      header: 'Mensuel HT',
      cell: (plan) => formatPlatformPlanPrice(
        plan.priceMonthlyExclTaxMinor,
        plan.currency,
      ),
    },
    {
      id: 'trial',
      header: 'Trial',
      cell: (plan) => (
        plan.trialEnabled
          ? `${plan.trialDurationDays} jour(s)`
          : 'Non'
      ),
    },
    {
      id: 'features',
      header: 'Fonctionnalités',
      cell: (plan) => String(plan.features?.length ?? 0),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (plan) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label="Voir"
            onClick={() => setSelectedPlan(plan)}
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrez les offres commerciales, leurs fonctionnalités, limites, tarifs et trials.
          </p>
        </div>
        <Button
          disabled={capabilitiesQuery.isLoading || Boolean(capabilitiesQuery.error)}
          onClick={openCreateForm}
          type="button"
        >
          <Plus aria-hidden="true" />
          Créer un plan
        </Button>
      </div>

      {capabilitiesQuery.error && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 p-3">
          <p className="text-sm text-destructive" role="alert">
            Le registre des fonctionnalités et limites n’est pas disponible. La création et la modification sont désactivées.
          </p>
          <Button onClick={capabilitiesQuery.refetch} type="button" variant="outline">
            Réessayer
          </Button>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Catalogue administratif</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {plansQuery.data?.pagination?.total ?? 0} plan(s)
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucun plan.</p>
        ) : (
          <DataTable columns={columns} data={plans} getRowKey={(plan) => plan.id} />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            disabled={plansQuery.isFetching}
            onPageChange={setPage}
            page={page}
            pagination={plansQuery.data?.pagination}
          />
        </div>
      </section>

      <PlatformPlanDetailsDrawer
        onArchive={requestArchive}
        onClose={() => setSelectedPlan(null)}
        onEdit={openEditForm}
        open={Boolean(selectedPlan)}
        plan={selectedPlan}
      />

      <EntityDetailsDrawer
        description={
          formState?.mode === 'create'
            ? 'Définissez une offre complète à partir du registre de capabilities actif.'
            : 'Modifiez l’offre sans changer sa clé technique immuable.'
        }
        onClose={closeForm}
        open={Boolean(formState)}
        title={formState?.mode === 'create' ? 'Créer un plan' : 'Modifier le plan'}
      >
        {formState && capabilitiesQuery.data && (
          <PlatformPlanForm
            capabilities={capabilitiesQuery.data}
            key={`${formState.mode}-${formState.plan?.id ?? 'new'}`}
            mode={formState.mode}
            onCancel={closeForm}
            onSubmit={submitPlan}
            pending={formPending}
            plan={formState.plan}
            submitError={formError}
          />
        )}
      </EntityDetailsDrawer>

      <ConfirmationDialog
        description={archiveTarget ? `Archiver définitivement l’offre ${archiveTarget.name} ? Elle sera retirée du catalogue public et ne pourra plus être modifiée.` : ''}
        errorMessage={archiveError}
        onCancel={() => {
          if (!archiveState.isLoading) setArchiveTarget(null);
        }}
        onConfirm={confirmArchive}
        open={Boolean(archiveTarget)}
        pending={archiveState.isLoading}
        title="Archiver le plan"
      />
    </div>
  );
}

export { PlatformPlansPage };
