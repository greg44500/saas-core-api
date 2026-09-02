import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { useListWorkspaceAuditLogsQuery } from '@/features/audit-log/api/audit-log-api';
import { AuditLogFilters, EMPTY_FILTERS } from '@/features/audit-log/components/audit-log-filters';
import { AuditLogPagination } from '@/features/audit-log/components/audit-log-pagination';
import { AuditLogTable } from '@/features/audit-log/components/audit-log-table';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  dateInputToIsoBoundary,
} from '@/features/audit-log/lib/audit-log-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

const PAGE_SIZE = 20;
const auditActionValues = new Set(AUDIT_ACTION_OPTIONS.map(([value]) => value));
const auditEntityTypeValues = new Set(AUDIT_ENTITY_TYPE_OPTIONS.map(([value]) => value));
const auditStatusValues = new Set(AUDIT_STATUS_OPTIONS.map(([value]) => value));

function parsePage(value) {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function readAllowedValue(searchParams, key, allowedValues) {
  const value = searchParams.get(key);
  return value && allowedValues.has(value) ? value : '';
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function readFilters(searchParams) {
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  return {
    action: readAllowedValue(searchParams, 'action', auditActionValues),
    entityType: readAllowedValue(searchParams, 'entityType', auditEntityTypeValues),
    status: readAllowedValue(searchParams, 'status', auditStatusValues),
    from: isValidDateInput(from) ? from : '',
    to: isValidDateInput(to) ? to : '',
  };
}

function writeSearchParams(filters, page = 1) {
  const next = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) next.set(key, value);
  });

  if (page > 1) next.set('page', String(page));
  return next;
}

function WorkspaceAuditLogPage() {
  const { workspace } = useWorkspaceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const filters = useMemo(
    () => readFilters(searchParams),
    [searchParams],
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
    return <p className="text-sm text-muted-foreground">Chargement de l’activité…</p>;
  }

  if (auditQuery.isError) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Historique d’activité</h1>
        <p className="text-sm text-destructive">
          Impossible de charger l’historique d’activité du workspace.
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
        onApply={applyFilters}
        onReset={resetFilters}
        pending={auditQuery.isFetching}
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
          {auditQuery.isFetching && (
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
          <AuditLogTable auditLogs={auditLogs} />
        )}

        <div className="px-5 pb-5">
          <AuditLogPagination
            onPageChange={changePage}
            page={page}
            pagination={pagination}
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
