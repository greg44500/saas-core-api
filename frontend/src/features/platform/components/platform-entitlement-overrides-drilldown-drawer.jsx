import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { DrawerViewTransition } from '@/components/shared/drawer-view-transition';
import {
  DRAWER_TRANSITION_MS,
  EntityDetailsDrawer,
} from '@/components/shared/entity-details-drawer';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useGetPlatformEntitlementOverrideQuery,
  useListPlatformEntitlementOverridesQuery,
  useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation,
} from '@/features/platform/api/platform-entitlement-overrides-api';
import { useListPlatformPlanCapabilitiesQuery } from '@/features/platform/api/platform-plans-api';
import { PlatformEntitlementOverrideDetails } from '@/features/platform/components/platform-entitlement-override-details-drawer';
import { PlatformEntitlementOverrideForm } from '@/features/platform/components/platform-entitlement-override-form';
import { PlatformEntitlementOverrideRevokeDialog } from '@/features/platform/components/platform-entitlement-override-revoke-dialog';
import {
  ENTITLEMENT_OVERRIDE_LIFECYCLE,
  formatPlatformEntitlementOverrideCapability,
} from '@/features/platform/lib/platform-entitlement-override-formatters';

const PAGE_SIZE = 20;
const VIEW = Object.freeze({
  LIST: 'list',
  DETAIL: 'detail',
  EDIT: 'edit',
});

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformEntitlementOverridesDrilldownContent({
  lifecycle,
  onClose,
  open,
  title,
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState(VIEW.LIST);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editError, setEditError] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeError, setRevokeError] = useState(null);

  const listQuery = useListPlatformEntitlementOverridesQuery({
    page,
    limit: PAGE_SIZE,
    lifecycle,
  });
  const detailQuery = useGetPlatformEntitlementOverrideQuery(selectedId, {
    skip: !selectedId,
  });
  const capabilitiesQuery = useListPlatformPlanCapabilitiesQuery();
  const [updateOverride, updateState] = useUpdatePlatformEntitlementOverrideMutation();
  const [revokeOverride, revokeState] = useRevokePlatformEntitlementOverrideMutation();

  const overrides = listQuery.data?.overrides ?? [];
  const total = listQuery.data?.pagination?.total ?? 0;
  const capabilities = capabilitiesQuery.data ?? {
    features: [],
    featureDefinitions: [],
    metrics: [],
  };

  function showDetail(overrideId) {
    setSelectedId(overrideId);
    setEditTarget(null);
    setView(VIEW.DETAIL);
  }

  function backToList() {
    setSelectedId(null);
    setEditTarget(null);
    setEditError(null);
    setView(VIEW.LIST);
  }

  function showEdit(override) {
    setEditTarget(override);
    setEditError(null);
    setView(VIEW.EDIT);
  }

  function requestRevoke(override) {
    setRevokeTarget(override);
    setRevokeError(null);
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
      setSelectedId(editTarget.id);
      setEditTarget(null);
      setView(VIEW.DETAIL);
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
      backToList();
    } catch (error) {
      setRevokeError(getApiMessage(error, 'La dérogation n’a pas pu être révoquée.'));
    }
  }

  function closeThenNavigate(target) {
    onClose();
    window.setTimeout(() => {
      navigate(target);
    }, DRAWER_TRANSITION_MS);
  }

  function viewWorkspace(workspace) {
    if (!workspace?.id) return;
    closeThenNavigate(`/platform/workspaces?workspaceId=${workspace.id}`);
  }

  function viewAll() {
    closeThenNavigate(`/platform/entitlement-overrides?lifecycle=${lifecycle}`);
  }

  const columns = [
    {
      id: 'workspace',
      header: 'Workspace',
      headerClassName: 'w-[45%]',
      cellClassName: 'break-words',
      cell: (override) => (
        <span className="font-medium">
          {override.workspace?.name ?? 'Workspace indisponible'}
        </span>
      ),
    },
    {
      id: 'capability',
      header: 'Dérogation',
      headerClassName: 'w-[40%]',
      cellClassName: 'break-words',
      cell: (override) => formatPlatformEntitlementOverrideCapability(override),
    },
    {
      id: 'actions',
      header: 'Action',
      headerClassName: 'w-[15%]',
      cell: (override) => (
        <DataTableActions>
          <ActionIconButton
            Icon={Eye}
            label="Voir"
            onClick={() => showDetail(override.id)}
            variant="outline"
          />
        </DataTableActions>
      ),
    },
  ];

  const drawerTitle = view === VIEW.EDIT
    ? 'Modifier la dérogation'
    : view === VIEW.DETAIL
      ? detailQuery.data?.workspace?.name ?? 'Détails de la dérogation'
      : `${title} (${total})`;

  const drawerDescription = view === VIEW.LIST
    ? 'Identifiez rapidement les workspaces concernés puis ouvrez une dérogation pour agir sans quitter le contexte Platform.'
    : view === VIEW.EDIT
      ? 'Modifiez uniquement les propriétés autorisées. La cible de la dérogation reste immuable.'
      : 'Consultez la dérogation, son workspace et les actions administratives disponibles.';

  return (
    <>
      <EntityDetailsDrawer
        description={drawerDescription}
        onClose={() => {
          if (!updateState.isLoading) onClose();
        }}
        open={open}
        title={drawerTitle}
      >
        <DrawerViewTransition viewKey={view}>
          {view !== VIEW.LIST && (
            <Button
              className="mb-4"
              disabled={updateState.isLoading}
              onClick={view === VIEW.EDIT
                ? () => setView(VIEW.DETAIL)
                : backToList}
              type="button"
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" />
              {view === VIEW.EDIT ? 'Retour au détail' : 'Retour aux dérogations'}
            </Button>
          )}

          {view === VIEW.LIST && (
            <div className="space-y-5">
              {listQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Chargement des dérogations…</p>
              )}

              {listQuery.error && (
                <div className="space-y-3">
                  <p className="text-sm text-destructive" role="alert">
                    Impossible de charger les dérogations.
                  </p>
                  <Button onClick={listQuery.refetch} type="button" variant="outline">
                    Réessayer
                  </Button>
                </div>
              )}

              {!listQuery.isLoading && !listQuery.error && overrides.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune dérogation ne correspond plus à ce statut.
                </p>
              )}

              {!listQuery.isLoading && !listQuery.error && overrides.length > 0 && (
                <DataTable
                  columns={columns}
                  data={overrides}
                  getRowKey={(override) => override.id}
                  rowClassName="transition-colors duration-150 hover:bg-muted/40 focus-within:bg-muted/40 motion-reduce:transition-none"
                  tableClassName="table-fixed"
                />
              )}

              <DataPagination
                disabled={listQuery.isFetching}
                onPageChange={setPage}
                page={page}
                pagination={listQuery.data?.pagination}
              />

              <Button onClick={viewAll} type="button" variant="outline">
                Voir toutes les dérogations
                <ExternalLink aria-hidden="true" />
              </Button>
            </div>
          )}

          {view === VIEW.DETAIL && (
            <PlatformEntitlementOverrideDetails
              error={detailQuery.error}
              isLoading={detailQuery.isLoading || detailQuery.isFetching}
              onEdit={showEdit}
              onRetry={detailQuery.refetch}
              onRevoke={requestRevoke}
              onViewWorkspace={viewWorkspace}
              override={detailQuery.data}
            />
          )}

          {view === VIEW.EDIT && editTarget && (
            <PlatformEntitlementOverrideForm
              capabilities={capabilities}
              mode="edit"
              onCancel={() => setView(VIEW.DETAIL)}
              onSubmit={submitEdit}
              override={editTarget}
              pending={updateState.isLoading}
              submitError={editError}
            />
          )}
        </DrawerViewTransition>
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
    </>
  );
}

function PlatformEntitlementOverridesDrilldownDrawer({
  lifecycle = ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
  onClose,
  open,
  title = 'Dérogations actives',
}) {
  const [isMounted, setIsMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      return undefined;
    }

    if (!isMounted) return undefined;

    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, DRAWER_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMounted, open]);

  if (!isMounted) return null;

  return (
    <PlatformEntitlementOverridesDrilldownContent
      lifecycle={lifecycle}
      onClose={onClose}
      open={open}
      title={title}
    />
  );
}

export { PlatformEntitlementOverridesDrilldownDrawer };
