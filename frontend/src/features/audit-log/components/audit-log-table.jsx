import { DataTable } from '@/components/data-display/data-table';
import {
  formatAuditAbsoluteDate,
  formatAuditRelativeDate,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditEntityTypeLabel,
  getAuditStatusLabel,
} from '@/features/audit-log/lib/audit-log-presentation';

function AuditStatusBadge({ status }) {
  const isFailure = status === 'failed';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        isFailure
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border bg-muted/40 text-foreground'
      }`}
    >
      {getAuditStatusLabel(status)}
    </span>
  );
}

const AUDIT_LOG_COLUMNS = [
  {
    id: 'action',
    header: 'Action',
    cellClassName: 'font-medium text-foreground',
    cell: (auditLog) => getAuditActionLabel(auditLog.action),
  },
  {
    id: 'actor',
    header: 'Acteur',
    cell: (auditLog) => (
      <>
        <p className="font-medium text-foreground">{getAuditActorLabel(auditLog.actor)}</p>
        {auditLog.actor?.email && (
          <p className="mt-1 text-xs text-muted-foreground">{auditLog.actor.email}</p>
        )}
      </>
    ),
  },
  {
    id: 'resource',
    header: 'Ressource',
    cellClassName: 'text-muted-foreground',
    cell: (auditLog) => (
      auditLog.entity
        ? getAuditEntityTypeLabel(auditLog.entity.type)
        : 'Non renseignée'
    ),
  },
  {
    id: 'status',
    header: 'Statut',
    cell: (auditLog) => <AuditStatusBadge status={auditLog.status} />,
  },
  {
    id: 'date',
    header: 'Date',
    cellClassName: 'text-muted-foreground',
    cell: (auditLog) => {
      const absoluteDate = formatAuditAbsoluteDate(auditLog.createdAt);

      return (
        <>
          <time dateTime={auditLog.createdAt} title={absoluteDate}>
            {formatAuditRelativeDate(auditLog.createdAt)}
          </time>
          <p className="mt-1 text-xs">{absoluteDate}</p>
        </>
      );
    },
  },
];

function AuditLogTable({ auditLogs }) {
  return (
    <DataTable
      columns={AUDIT_LOG_COLUMNS}
      data={auditLogs}
      getRowKey={(auditLog) => auditLog.id}
      headerClassName="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground"
      rowClassName="align-top"
      tableClassName="min-w-[760px]"
    />
  );
}

export { AuditLogTable, AuditStatusBadge };
