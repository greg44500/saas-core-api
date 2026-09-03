import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { DataPagination } from '@/components/data-display/data-pagination';
import { Button } from '@/components/ui/button';
import { AuditLogFilters, EMPTY_FILTERS } from '@/features/audit-log/components/audit-log-filters';
import { AuditLogTable } from '@/features/audit-log/components/audit-log-table';
import { dateInputToIsoBoundary } from '@/features/audit-log/lib/audit-log-presentation';
import {
  parsePage,
  readFilters,
  writeSearchParams,
} from '@/features/audit-log/lib/audit-log-query-state';
import { useListPlatformAuditLogsQuery } from '@/features/platform/api/platform-audit-logs-api';

const PAGE_SIZE = 20;

function PlatformAuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const filters = useMemo(
    () => readFilters(searchParams),
    [searchParams],
  );

  const auditQuery = useListPlatformAuditLogsQuery(
    {
      page,
      limit: PAGE_SIZE,
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      status: filters.status || undefined,
      from: dateInputToIsoBoundary(filters.from, 'start'),
      to: dateInputToIsoBoundary(filters.to, 'end'),
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const auditLogs = auditQuery.data?.auditLogs ?? [];
  const pagination = auditQuery.data?.pagination;

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

  if (auditQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des événements d’audit…</p>;
  }

  if (auditQuery.isError) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Audit logs</h1>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les événements d’audit de la plateforme.
        </p>
        <Button onClick={auditQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Consultez l’historique global audité de la plateforme. Les adresses IP,
          user-agents et metadata techniques restent volontairement absents de cette vue.
        </p>
      </header>

      <AuditLogFilters
        filters={filters}
        onApply={applyFilters}
        onReset={resetFilters}
        pending={auditQuery.isFetching}
      />

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Événements Platform</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {pagination?.total ?? auditLogs.length} événement
              {(pagination?.total ?? auditLogs.length) === 1 ? '' : 's'}
            </p>
          </div>
          {auditQuery.isFetching && (
            <span className="text-xs text-muted-foreground" role="status">
              Actualisation…
            </span>
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
          <AuditLogTable auditLogs={auditLogs} showWorkspace />
        )}

        <div className="px-5 pb-5">
          <DataPagination
            className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
            disabled={auditQuery.isFetching}
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

export { PAGE_SIZE, PlatformAuditLogsPage };
