import { useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { SelectField } from '@/components/shared/select-field';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useCreatePlatformEntitlementOverrideMutation,
  useCreatePlatformFeatureOverrideGroupMutation,
  useGetPlatformEntitlementContextQuery,
  useGetPlatformEntitlementOverrideQuery,
  useGetPlatformFeatureOverrideGroupQuery,
  useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation,
  useUpdatePlatformFeatureOverrideGroupMutation,
} from '@/features/platform/api/platform-entitlement-overrides-api';
import { useListPlatformPlanCapabilitiesQuery } from '@/features/platform/api/platform-plans-api';
import { useListPlatformWorkspacesQuery } from '@/features/platform/api/platform-workspaces-api';
import { PlatformEntitlementOverrideDetailsDrawer } from '@/features/platform/components/platform-entitlement-override-details-drawer';
import { PlatformEntitlementOverrideForm } from '@/features/platform/components/platform-entitlement-override-form';
import { PlatformEntitlementPeriod } from '@/features/platform/components/platform-entitlement-period';
import { PlatformEntitlementOverrideRevokeDialog } from '@/features/platform/components/platform-entitlement-override-revoke-dialog';
import { PlatformEntitlementLifecycleBadge } from '@/features/platform/components/platform-entitlement-status-badge';
import { PlatformEntitlementSubject } from '@/features/platform/components/platform-entitlement-subject';
import { PlatformTablePageSkeleton } from '@/features/platform/components/platform-loading-skeletons';
import { PlatformWorkspaceFeatureOverrides } from '@/features/platform/components/platform-workspace-feature-overrides';
import {
  ENTITLEMENT_OVERRIDE_LIFECYCLE,
  ENTITLEMENT_OVERRIDE_SOURCE,
  ENTITLEMENT_OVERRIDE_TARGET,
  formatPlatformEntitlementOverrideLifecycle,
  formatPlatformEntitlementOverrideSource,
} from '@/features/platform/lib/platform-entitlement-override-formatters';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const ALL_FILTERS_VALUE = '__all__';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function readPositivePage(searchParams) {
  const value = Number(searchParams.get('page') ?? 1);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function readPageSize(searchParams) {
  const value = Number(searchParams.get('limit') ?? DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PAGE_SIZE;
}

function normalizeFilterValue(value) {
  return value === ALL_FILTERS_VALUE ? '' : value;
}

function PlatformEntitlementOverridesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editFeatureGroup, setEditFeatureGroup] = useState(null);
  const [editError, setEditError] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeError, setRevokeError] = useState(null);

  const page = readPositivePage(searchParams);
  const pageSize = readPageSize(searchParams);
  const workspaceId = searchParams.get('workspaceId') ?? '';
  const source = searchParams.get('source') ?? '';
  const lifecycle = searchParams.get('lifecycle') ?? '';

  const listQuery = useListPlatformEntitlementOverridesQuery({
    page,
    limit: pageSize,
    workspaceId: workspaceId || undefined,
    source: source || undefined,
    lifecycle: lifecycle || undefined,
  });
  const detailQuery = useGetPlatformEntitlementOverrideQuery(selectedId, {
    skip: !selectedId,
  });
  const selectedIsFeature = detailQuery.data?.targetType
    === ENTITLEMENT_OVERRIDE_TARGET.FEATURE;
  const selectedFeatureGroupQuery = useGetPlatformFeatureOverrideGroupQuery(
    detailQuery.data?.id,
    {
      skip: !detailQuery.data?.id || !selectedIsFeature,
    },
  );
  const entitlementContextQuery = useGetPlatformEntitlementContextQuery(
    workspaceId,
    { skip: !workspaceId },
  );
  const editEntitlementContextQuery = useGetPlatformEntitlementContextQuery(
    editTarget?.workspace?.id,
    { skip: !editTarget?.workspace?.id },
  );
  const capabilitiesQuery = useListPlatformPlanCapabilitiesQuery();
  const workspacesQuery = useListPlatformWorkspacesQuery({ page: 1, limit: 100 });

  const [createOverride, createState] = useCreatePlatformEntitlementOverrideMutation();
  const [createFeatureGroup, createFeatureGroupState] =
    useCreatePlatformFeatureOverrideGroupMutation();
  const [updateOverride, updateState] = useUpdatePlatformEntitlementOverrideMutation();
  const [updateFeatureGroup, updateFeatureGroupState] =
    useUpdatePlatformFeatureOverrideGroupMutation();
  const [revokeOverride, revokeState] = useRevokePlatformEntitlementOverrideMutation();

  const overrides = listQuery.data?.overrides ?? [];
  const workspaces = workspacesQuery.data?.workspaces ?? [];
  const capabilities = capabilitiesQuery.data ?? {
    features: [],
    featureDefinitions: [],
    metrics: [],
  };
  const createPending = createState.isLoading || createFeatureGroupState.isLoading;
  const editPending = updateState.isLoading || updateFeatureGroupState.isLoading;

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

  function changePageSize(nextPageSize) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPageSize === DEFAULT_PAGE_SIZE) next.delete('limit');
      else next.set('limit', String(nextPageSize));
      next.delete('page');
      return next;
    });
  }

  function resetFilters() {
    setSearchParams((current) => {
      const next = new URLSearchParams();
      const currentLimit = current.get('limit');
      if (currentLimit) next.set('limit', currentLimit);
      return next;
    });
  }

  async function submitCreate(payload) {
    setCreateError(null);

    try {
      const isGroupedFeature = payload.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
        && payload.featureEnabled === true
        && payload.groupName;

      if (isGroupedFeature) {
        const { targetType: _targetType, ...groupPayload } = payload;
        await createFeatureGroup(groupPayload).unwrap();
      } else {
        await createOverride(payload).unwrap();
      }

      toast({
        title: 'Dérogation exceptionnelle créée',
        variant: 'success',
      });
      setCreateOpen(false);
    } catch (error) {
      setCreateError(getApiMessage(error, 'La dérogation n’a pas pu être créée.'));
    }
  }

  async function submitEdit(payload) {
    if (!editTarget) return;
    setEditError(null);

    try {
      if (editFeatureGroup?.groupId) {
        await updateFeatureGroup({
          overrideId: editTarget.id,
          workspaceId: editTarget.workspace?.id,
          ...payload,
        }).unwrap();
      } else {
        await updateOverride({
          overrideId: editTarget.id,
          workspaceId: editTarget.workspace?.id,
          ...payload,
        }).unwrap();
      }

      toast({ title: 'Dérogation mise à jour', variant: 'success' });
      setEditTarget(null);
      setEditFeatureGroup(null);
    } catch (error) {
      setEditError(getApiMessage(error, 'La dérogation n’a pas pu être mise à jour.'));
    }
  }

  async function confirmRevoke(reason) {
    if (!revokeTarget) return;

    setRevokeError(null);
    try {
      await revokeOverride({
        overrideId: revokeTarget.id,
        workspaceId: revokeTarget.workspace?.id,
        reason,
      }).unwrap();
      toast({ title: 'Dérogation révoquée', variant: 'success' });
      setRevokeTarget(null);
    } catch (error) {
      setRevokeError(getApiMessage(error, 'La dérogation n’a pas pu être révoquée.'));
    }
  }

  if (listQuery.isLoading || (listQuery.isFetching && listQuery.data === undefined)) {
    return (
      <PlatformTablePageSkeleton
        columns={5}
        showAction
        showFilters
      />
    );
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
      id: 'subject',
      header: 'Fonctionnalité',
      cell: (override) => (
        <PlatformEntitlementSubject
          featureDefinitions={capabilities.featureDefinitions}
          override={override}
        />
      ),
    },
    {
      id: 'lifecycle',
      header: 'Statut',
      cell: (override) => (
        <PlatformEntitlementLifecycleBadge lifecycle={override.lifecycle} />
      ),
    },
    {
      id: 'period',
      header: 'Période',
      cell: (override) => <PlatformEntitlementPeriod override={override} />,
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
    || entitlementContextQuery.isLoading
    || Boolean(capabilitiesQuery.error)
    || Boolean(workspacesQuery.error)
    || Boolean(entitlementContextQuery.error);

  const workspaceFilterItems = [
    { value: ALL_FILTERS_VALUE, label: 'Tous' },
    ...workspaces.map((workspace) => ({
      value: workspace.id,
      label: workspace.name ?? workspace.id,
    })),
  ];
  const sourceFilterItems = [
    { value: ALL_FILTERS_VALUE, label: 'Toutes' },
    ...Object.values(ENTITLEMENT_OVERRIDE_SOURCE).map((value) => ({
      value,
      label: formatPlatformEntitlementOverrideSource(value),
    })),
  ];
  const lifecycleFilterItems = [
    { value: ALL_FILTERS_VALUE, label: 'Tous' },
    ...Object.values(ENTITLEMENT_OVERRIDE_LIFECYCLE).map((value) => ({
      value,
      label: formatPlatformEntitlementOverrideLifecycle(value),
    })),
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Dérogations</h1>
            <InfoTooltip
              content="Personnalisez l’offre d’un workspace sans modifier le plan catalogue partagé."
              label="À propos des dérogations"
            />
          </div>
          <p className="sr-only">
            Personnalisez l’offre d’un workspace sans modifier le plan catalogue partagé.
          </p>
        </div>
        <Button
          disabled={!workspaceId || setupUnavailable}
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" />
          Dérogation exceptionnelle
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-2">
          <h2 className="text-lg font-semibold">Filtres</h2>
          <InfoTooltip
            content="Sélectionnez un workspace pour afficher ses fonctionnalités actives et créer une dérogation contextualisée."
            label="À propos des filtres"
          />
        </div>
        <p className="sr-only">
          Sélectionnez un workspace pour afficher ses fonctionnalités actives et créer une dérogation contextualisée.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SelectField
            id="override-filter-workspace"
            items={workspaceFilterItems}
            label="Espace de travail"
            onValueChange={(value) => updateFilter(
              'workspaceId',
              normalizeFilterValue(value),
            )}
            value={workspaceId || ALL_FILTERS_VALUE}
          />
          <SelectField
            id="override-filter-source"
            items={sourceFilterItems}
            label="Origine"
            onValueChange={(value) => updateFilter(
              'source',
              normalizeFilterValue(value),
            )}
            value={source || ALL_FILTERS_VALUE}
          />
          <SelectField
            id="override-filter-lifecycle"
            items={lifecycleFilterItems}
            label="Statut"
            onValueChange={(value) => updateFilter(
              'lifecycle',
              normalizeFilterValue(value),
            )}
            value={lifecycle || ALL_FILTERS_VALUE}
          />
        </div>

        {(workspaceId || source || lifecycle) && (
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
          La liste reste consultable, mais les informations commerciales sont indisponibles tant que les workspaces et le registre de fonctionnalités ne sont pas chargés.
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
            onPageSizeChange={changePageSize}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            pagination={listQuery.data?.pagination}
          />
        </div>
      </section>

      <PlatformEntitlementOverrideDetailsDrawer
        error={detailQuery.error}
        featureGroup={selectedFeatureGroupQuery.data}
        featureGroupError={selectedFeatureGroupQuery.error}
        featureGroupLoading={selectedIsFeature
          && (selectedFeatureGroupQuery.isLoading || selectedFeatureGroupQuery.isFetching)}
        isLoading={detailQuery.isLoading || detailQuery.isFetching}
        onClose={() => setSelectedId(null)}
        onEdit={(override) => {
          setEditFeatureGroup(
            override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE
              ? selectedFeatureGroupQuery.data
              : null,
          );
          setSelectedId(null);
          setEditError(null);
          setEditTarget(override);
        }}
        onRetry={detailQuery.refetch}
        onRevoke={(override) => {
          setSelectedId(null);
          setRevokeError(null);
          setRevokeTarget(override);
        }}
        onViewWorkspace={(workspace) => {
          if (workspace?.id) {
            setSelectedId(null);
            navigate(`/platform/workspaces?workspaceId=${workspace.id}`);
          }
        }}
        open={Boolean(selectedId)}
        override={detailQuery.data}
      />

      <EntityDetailsDrawer
        description="Accordez ou suspendez exceptionnellement une fonctionnalité, éventuellement pour une période précise, sans modifier le plan catalogue."
        onClose={() => {
          if (!createPending) setCreateOpen(false);
        }}
        open={createOpen}
        title="Dérogation exceptionnelle"
      >
        <PlatformEntitlementOverrideForm
          capabilities={capabilities}
          entitlementContext={entitlementContextQuery.data}
          mode="create"
          onCancel={() => setCreateOpen(false)}
          onSubmit={submitCreate}
          pending={createPending}
          submitError={createError}
          workspaceId={workspaceId}
        />
      </EntityDetailsDrawer>

      <EntityDetailsDrawer
        description="Modifiez la période, l’origine, le motif et les paramètres associés. La fonctionnalité ciblée reste immuable."
        onClose={() => {
          if (!editPending) {
            setEditTarget(null);
            setEditFeatureGroup(null);
          }
        }}
        open={Boolean(editTarget)}
        title={editFeatureGroup?.groupName ?? 'Modifier la dérogation'}
      >
        {editTarget && (
          <PlatformEntitlementOverrideForm
            capabilities={capabilities}
            entitlementContext={editEntitlementContextQuery.data}
            featureGroup={editFeatureGroup}
            mode="edit"
            onCancel={() => {
              setEditTarget(null);
              setEditFeatureGroup(null);
            }}
            onSubmit={submitEdit}
            override={editTarget}
            pending={editPending || editEntitlementContextQuery.isLoading}
            submitError={editError}
          />
        )}
      </EntityDetailsDrawer>

      <PlatformEntitlementOverrideRevokeDialog
        errorMessage={revokeError}
        onCancel={() => {
          if (revokeState.isLoading) return;
          setRevokeTarget(null);
          setRevokeError(null);
        }}
        onConfirm={confirmRevoke}
        override={revokeTarget}
        pending={revokeState.isLoading}
      />
    </div>
  );
}

export {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  PlatformEntitlementOverridesPage,
  readPageSize,
};