import { useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementOverrideQuery,
  useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation,
} from '@/features/platform/api/platform-entitlement-overrides-api';
import { useListPlatformPlanCapabilitiesQuery } from '@/features/platform/api/platform-plans-api';
import { useListPlatformWorkspacesQuery } from '@/features/platform/api/platform-workspaces-api';
import { PlatformEntitlementOverrideDetailsDrawer } from '@/features/platform/components/platform-entitlement-override-details-drawer';
import { PlatformEntitlementOverrideForm } from '@/features/platform/components/platform-entitlement-override-form';
import { PlatformWorkspaceFeatureOverrides } from '@/features/platform/components/platform-workspace-feature-overrides';
import {
  ENTITLEMENT_OVERRIDE_LIFECYCLE,
  ENTITLEMENT_OVERRIDE_SOURCE,
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideCapability,
  formatPlatformEntitlementOverrideDate,
  formatPlatformEntitlementOverrideLifecycle,
  formatPlatformEntitlementOverrideSource,
  formatPlatformEntitlementOverrideTarget,
  formatPlatformEntitlementOverrideValue,
} from '@/features/platform/lib/platform-entitlement-override-formatters';

const PAGE_SIZE = 20;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function getLifecycleTone(lifecycle) {
  if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE) return 'success';
  if (lifecycle === ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED) return 'info';
  return 'neutral';
}

function readPositivePage(searchParams) {
  const value = Number(searchParams.get('page') ?? 1);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function PlatformEntitlementOverridesPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editError, setEditError] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState(null);

  const page = readPositivePage(searchParams);
  const workspaceId = searchParams.get('workspaceId') ?? '';
  const targetType = searchParams.get('targetType') ?? '';
  const source = searchParams.get('source') ?? '';

  const listQuery = useListPlatformEntitlementOverridesQuery({
    page,
    limit: PAGE_SIZE,
    workspaceId: workspaceId || undefined,
    targetType: targetType || undefined,
    source: source || undefined,
  });
  const detailQuery = useGetPlatformEntitlementOverrideQuery(selectedId, {
    skip: !selectedId,
  });
  const capabilitiesQuery = useListPlatformPlanCapabilitiesQuery();
  const workspacesQuery = useListPlatformWorkspacesQuery({ page: 1, limit: 100 });

  const [createOverride, createState] = useCreatePlatformEntitlementOverrideMutation();
  const [updateOverride, updateState] = useUpdatePlatformEntitlementOverrideMutation();
  const [revokeOverride, revokeState] = useRevokePlatformEntitlementOverrideMutation();

  const overrides = listQuery.data?.overrides ?? [];
  const workspaces = workspacesQuery.data?.workspaces ?? [];
  const capabilities = capabilitiesQuery.data ?? {
    features: [],
    featureDefinitions: [],
    metrics: [],
  };

  function updateFilter(key, value) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  function changePage(nextPage) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage <= 1) next.delete('page');
      else next.set('page', String(nextPage));
      return next;
    });
  }

  function resetFilters() {
    setSearchParams({});
  }

  async function submitCreate(payload) {
    setCreateError(null);
    try {
      await createOverride(payload).unwrap();
      toast({ title: 'Dérogation créée', variant: 'success' });
      setCreateOpen(false);
    } catch (error) {
      setCreateError(getApiMessage(error, 'La dérogation n’a pas pu être créée.'));
    }
  }

  async function submitEdit(payload) {
    if (!editTarget) return;
    setEditError(null);
    try {
      await updateOverride({
        overrideId: editTarget.id,
        workspaceId: editTarget.workspace?.id,
        ...payload,
      }).unwrap();
      toast({ title: 'Dérogation mise à jour', variant: 'success' });
      setEditTarget(null);
    } catch (error) {
      setEditError(getApiMessage(error, 'La dérogation n’a pas pu être mise à jour.'));
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    const reason = revokeReason.trim();
    if (reason.length < 3 || reason.length > 500) {
      setRevokeError('Le motif de révocation doit contenir entre 3 et 500 caractères.');
      return;
    }

    setRevokeError(null);
    try {
      await revokeOverride({
        overrideId: revokeTarget.id,
        workspaceId: revokeTarget.workspace?.id,
        reason,
      }).unwrap();
      toast({ title: 'Dérogation révoquée', variant: 'success' });
      setRevokeTarget(null);
      setRevokeReason('');
    } catch (error) {
      setRevokeError(getApiMessage(error, 'La dérogation n’a pas pu être révoquée.'));
    }
  }

  if (listQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des dérogations…</p>;
  }

  if (listQuery.error) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Dérogations</h1>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les dérogations de la plateforme.
        </p>
        <Button onClick={listQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  const columns = [
    {
      id: 'workspace',
      header: 'Espace de travail',
      cell: (override) => override.workspace?.name ?? 'Workspace indisponible',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (override) => formatPlatformEntitlementOverrideTarget(override.targetType),
    },
    {
      id: 'capability',
      header: 'Capability',
      cell: (override) => formatPlatformEntitlementOverrideCapability(override),
    },
    {
      id: 'value',
      header: 'Valeur',
      cell: (override) => formatPlatformEntitlementOverrideValue(override),
    },
    {
      id: 'lifecycle',
      header: 'État',
      cell: (override) => (
        <StatusBadge tone={getLifecycleTone(override.lifecycle)}>
          {formatPlatformEntitlementOverrideLifecycle(override.lifecycle)}
        </StatusBadge>
      ),
    },
    {
      id: 'endsAt',
      header: 'Fin',
      cell: (override) => override.endsAt
        ? formatPlatformEntitlementOverrideDate(override.endsAt)
        : 'Permanente',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (override) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label="Voir"
            onClick={() => setSelectedId(override.id)}
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  const setupUnavailable = capabilitiesQuery.isLoading
    || workspacesQuery.isLoading
    || Boolean(capabilitiesQuery.error)
    || Boolean(workspacesQuery.error);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dérogations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personnalisez l’offre d’un workspace sans modifier le plan catalogue partagé.
          </p>
        </div>
        <Button
          disabled={setupUnavailable}
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" />
          Dérogation avancée
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Filtres</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionner un workspace affiche aussi ses fonctionnalités effectives et leurs réglages rapides.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-filter-workspace">Espace de travail</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-filter-workspace"
              onChange={(event) => updateFilter('workspaceId', event.target.value)}
              value={workspaceId}
            >
              <option value="">Tous</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name ?? workspace.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-filter-type">Type</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-filter-type"
              onChange={(event) => updateFilter('targetType', event.target.value)}
              value={targetType}
            >
              <option value="">Tous</option>
              <option value={ENTITLEMENT_OVERRIDE_TARGET.FEATURE}>Fonctionnalité</option>
              <option value={ENTITLEMENT_OVERRIDE_TARGET.LIMIT}>Limite</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="override-filter-source">Origine</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="override-filter-source"
              onChange={(event) => updateFilter('source', event.target.value)}
              value={source}
            >
              <option value="">Toutes</option>
              {Object.values(ENTITLEMENT_OVERRIDE_SOURCE).map((value) => (
                <option key={value} value={value}>
                  {formatPlatformEntitlementOverrideSource(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(workspaceId || targetType || source) && (
          <Button className="mt-4" onClick={resetFilters} type="button" variant="ghost">
            Réinitialiser les filtres
          </Button>
        )}
      </section>

      {workspaceId && !capabilitiesQuery.error && (
        <PlatformWorkspaceFeatureOverrides
          capabilities={capabilities}
          workspaceId={workspaceId}
        />
      )}

      {(capabilitiesQuery.error || workspacesQuery.error) && (
        <p className="text-sm text-warning" role="status">
          La liste reste consultable, mais les réglages commerciaux sont indisponibles tant que les workspaces et le registre de capabilities ne sont pas chargés.
        </p>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Dérogations Platform</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {listQuery.data?.pagination?.total ?? 0} dérogation(s)
          </p>
        </div>

        {overrides.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucune dérogation pour ces critères.</p>
        ) : (
          <DataTable columns={columns} data={overrides} getRowKey={(override) => override.id} />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            disabled={listQuery.isFetching}
            onPageChange={changePage}
            page={page}
            pagination={listQuery.data?.pagination}
          />
        </div>
      </section>

      <PlatformEntitlementOverrideDetailsDrawer
        error={detailQuery.error}
        isLoading={detailQuery.isLoading || detailQuery.isFetching}
        onClose={() => setSelectedId(null)}
        onEdit={(override) => {
          setSelectedId(null);
          setEditError(null);
          setEditTarget(override);
        }}
        onRetry={detailQuery.refetch}
        onRevoke={(override) => {
          setSelectedId(null);
          setRevokeError(null);
          setRevokeReason('');
          setRevokeTarget(override);
        }}
        open={Boolean(selectedId)}
        override={detailQuery.data}
      />

      <EntityDetailsDrawer
        description="Créez une exception avancée à partir des seules capabilities enregistrées par l’application."
        onClose={() => {
          if (!createState.isLoading) setCreateOpen(false);
        }}
        open={createOpen}
        title="Nouvelle dérogation"
      >
        <PlatformEntitlementOverrideForm
          capabilities={capabilities}
          mode="create"
          onCancel={() => setCreateOpen(false)}
          onSubmit={submitCreate}
          pending={createState.isLoading}
          submitError={createError}
          workspaces={workspaces}
        />
      </EntityDetailsDrawer>

      <EntityDetailsDrawer
        description="Modifiez la valeur, la période, l’origine ou le motif. La cible de la dérogation reste immuable."
        onClose={() => {
          if (!updateState.isLoading) setEditTarget(null);
        }}
        open={Boolean(editTarget)}
        title="Modifier la dérogation"
      >
        {editTarget && (
          <PlatformEntitlementOverrideForm
            capabilities={capabilities}
            mode="edit"
            onCancel={() => setEditTarget(null)}
            onSubmit={submitEdit}
            override={editTarget}
            pending={updateState.isLoading}
            submitError={editError}
            workspaces={workspaces}
          />
        )}
      </EntityDetailsDrawer>

      {revokeTarget && (
        <ConfirmationDialog
          confirmLabel="Révoquer"
          description={`La dérogation de ${revokeTarget.workspace?.name ?? 'ce workspace'} cessera d’être applicable. L’historique sera conservé.`}
          errorMessage={revokeError}
          onCancel={() => {
            if (revokeState.isLoading) return;
            setRevokeTarget(null);
            setRevokeReason('');
            setRevokeError(null);
          }}
          onConfirm={confirmRevoke}
          pending={revokeState.isLoading}
          pendingLabel="Révocation…"
          title="Révoquer la dérogation ?"
        >
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium" htmlFor="override-revoke-reason">Motif de révocation</label>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="override-revoke-reason"
              maxLength={500}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder="Pourquoi cette dérogation doit-elle être révoquée ?"
              value={revokeReason}
            />
          </div>
        </ConfirmationDialog>
      )}
    </div>
  );
}

export { PlatformEntitlementOverridesPage };
