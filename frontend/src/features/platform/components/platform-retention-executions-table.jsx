import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable } from '@/components/data-display/data-table';
import { DataTableSkeleton } from '@/components/data-display/data-table-skeleton';
import {
  formatRetentionDate,
  getRetentionExecutionErrorLabel,
  getRetentionExecutionStatusLabel,
  getRetentionExecutionTriggerLabel,
} from '@/features/platform/lib/platform-retention';
import { cn } from '@/lib/utils';

const STATUS_CLASSES = Object.freeze({
  running: 'border-warning/30 bg-warning/10 text-warning',
  succeeded: 'border-success/30 bg-success/10 text-success',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
});

function ExecutionStatus({ status }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        STATUS_CLASSES[status] ?? 'border-border bg-muted text-muted-foreground',
      )}
    >
      {getRetentionExecutionStatusLabel(status)}
    </span>
  );
}

function ExecutionError({ errorCode }) {
  if (!errorCode) return '—';

  return (
    <span
      className="font-medium text-destructive"
      role="alert"
      title={`Code technique : ${errorCode}`}
    >
      {getRetentionExecutionErrorLabel(errorCode)}
    </span>
  );
}

const columns = [
  {
    id: 'startedAt',
    header: 'Début',
    cell: (execution) => formatRetentionDate(execution.startedAt),
  },
  {
    id: 'trigger',
    header: 'Déclenchement',
    cell: (execution) => getRetentionExecutionTriggerLabel(execution.trigger),
  },
  {
    id: 'policyVersion',
    header: 'Politique',
    cell: (execution) => `v${execution.policyVersion}`,
  },
  {
    id: 'status',
    header: 'Statut',
    cell: (execution) => <ExecutionStatus status={execution.status} />,
  },
  {
    id: 'affected',
    header: 'Purgés',
    cell: (execution) => execution.counters?.affected ?? 0,
    cellClassName: 'text-right',
  },
  {
    id: 'selected',
    header: 'Sélectionnés',
    cell: (execution) => execution.counters?.selected ?? 0,
    cellClassName: 'text-right',
  },
  {
    id: 'batches',
    header: 'Lots',
    cell: (execution) => execution.batchesProcessed ?? 0,
    cellClassName: 'text-right',
  },
  {
    id: 'errorCode',
    header: 'Erreur',
    cell: (execution) => <ExecutionError errorCode={execution.errorCode} />,
  },
];

function PlatformRetentionExecutionsTable({
  executions,
  loading,
  onPageChange,
  page,
  pagination,
}) {
  const hasExecutions = Array.isArray(executions) && executions.length > 0;

  return (
    <div>
      {loading && !hasExecutions ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <DataTableSkeleton columns={columns.length} rows={5} />
        </div>
      ) : !hasExecutions ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune exécution de rétention.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={executions}
          getRowKey={(execution) => execution.id}
        />
      )}
      <DataPagination
        disabled={loading}
        onPageChange={onPageChange}
        page={page}
        pagination={pagination}
      />
    </div>
  );
}

export { PlatformRetentionExecutionsTable };
