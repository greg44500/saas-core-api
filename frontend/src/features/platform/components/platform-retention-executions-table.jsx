import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable } from '@/components/data-display/data-table';
import {
  formatRetentionDate,
  getRetentionExecutionStatusLabel,
  getRetentionExecutionTriggerLabel,
} from '@/features/platform/lib/platform-retention';

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
    header: 'Policy',
    cell: (execution) => `v${execution.policyVersion}`,
  },
  {
    id: 'status',
    header: 'Statut',
    cell: (execution) => getRetentionExecutionStatusLabel(execution.status),
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
    cell: (execution) => execution.errorCode ?? '—',
  },
];

function PlatformRetentionExecutionsTable({
  executions,
  loading,
  onPageChange,
  page,
  pagination,
}) {
  return (
    <div>
      {(!executions || executions.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {loading ? 'Chargement des exécutions…' : 'Aucune exécution de rétention.'}
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
