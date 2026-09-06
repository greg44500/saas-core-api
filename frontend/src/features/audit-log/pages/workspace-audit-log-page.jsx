import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { Button } from '@/components/ui/button';
import {
  useGetWorkspaceAuditMetadataQuery,
  useListWorkspaceAuditLogsQuery,
} from '@/features/audit-log/api/audit-log-api';
import { AuditLogFilters, EMPTY_FILTERS } from '@/features/audit-log/components/audit-log-filters';
import { AuditLogTable } from '@/features/audit-log/components/audit-log-table';
import { dateInputToIsoBoundary } from '@/features/audit-log/lib/audit-log-presentation';
import {
  isValidDateInput,
  parsePage,
  readFilters,
  writeSearchParams,
} from '@/features/audit-log/lib/audit-log-query-state';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

const PAGE_SIZE = 20;

function WorkspaceAuditLogPage() {
  const { workspace } = useWorkspaceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const metadataQuery = useGetWorkspaceAuditMetadataQuery(workspace.id);
  const auditMetadata = metadataQuery.data;
  const filters = useMemo(
    () => readFilters(searchParams, auditMetadata),
    [auditMetadata, searchParams],
  );

  const auditQuery = useListWorkspaceAuditLogsQuery(
    {
      workspaceId: workspace.id,
      page,
      limit: PAGE_SIZE,
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      status: filters.status || undefined,
      from: dateInputToIsoBoundary(filters.from, 'start'),
      to: dateInputToIsoBoundary(filters.to, 'end'),
    },
    {
      skip: !auditMetadata,
      refetchOnMountOrArgChange: true,
    },
  );

  const auditLogs = auditQuery.data?.auditLogs ?? [];
  const pagination = auditQuery.data?.pagination;
  const isFetching = auditQuery.isFetching || metadataQuery.isFetching;

  useEffect(() => {
    if (pagination?.totalPages > 0 && page > pagination.totalPages) {
      setSearchParams(writeSearchParams(filters, pagination.totalPages), { replace: true });
    }
  }, [filters, page, pagination?.totalPages, setSearchParams]);

  function applyFilters(nextFilters) {
    setSearchParams(writeSearchParams(nextFilters, 1));
  }

  function resetFilters() {
    setSearchParams(writeSearchParams(EMPTY_FILTERS, 1));
  }

  function changePage(nextPage) {
    setSearchParams(writeSearchParams(filters, nextPage));
  }

  function refetchAuditData() {
    metadataQuery.refetch();
    if (!auditQuery.isUninitialized) {
      auditQuery.refetch();
    }
  }

  if (metadataQuery.isLoading || (auditMetadata && auditQuery.isLoading)) {
    return <p className="text-sm text-muted-foreground">Chargement de l’activité…</p>;
  }

  if (metadataQuery.isError || auditQuery.isError) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Historique d’activité</h1>
        <p className="text-sm text-destructive">
          Impossible de charger l’historique d’activité de l’espace de travail.
        </p>
        <Button onClick={refetchAuditData} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Historique d’activité</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Consultez les événements audités de{' '}
          <strong className="font-semibold text-foreground">{workspace.name}</strong>. Les informations
          techniques sensibles ne sont pas exposées dans cette vue.
        </p>
      </header>

      <AuditLogFilters
        filters={filters}
        metadata={auditMetadata}
        onApply={applyFilters}
        onReset={resetFilters}
        pending={isFetching}
      />

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Événements</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {pagination?.total ?? auditLogs.length} événement
              {(pagination?.total ?? auditLogs.length) === 1 ? '' : 's'}
            </p>
          </div>
          {isFetching && (
            <span className="text-xs text-muted-foreground" role="status">Actualisation…</span>
          )}
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-5">
            <p className="text-sm font-medium">Aucun événement trouvé</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun événement d’audit ne correspond aux critères actuels.
            </p>
          </div>
        ) : (
          <AuditLogTable auditLogs={auditLogs} metadata={auditMetadata} />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
            disabled={isFetching}
            onPageChange={changePage}
            page={page}
            pagination={pagination}
            summary={pagination ? (
              <>
                Page {pagination.page} sur {pagination.totalPages} · {pagination.total} événement
                {pagination.total === 1 ? '' : 's'}
              </>
            ) : undefined}
          />
        </div>
      </section>
    </div>
  );
}

export {
  PAGE_SIZE,
  WorkspaceAuditLogPage,
  isValidDateInput,
  parsePage,
  readFilters,
  writeSearchParams,
};
