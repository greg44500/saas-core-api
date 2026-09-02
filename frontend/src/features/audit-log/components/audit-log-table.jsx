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

function AuditLogTable({ auditLogs }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium" scope="col">Action</th>
            <th className="px-5 py-3 font-medium" scope="col">Acteur</th>
            <th className="px-5 py-3 font-medium" scope="col">Ressource</th>
            <th className="px-5 py-3 font-medium" scope="col">Statut</th>
            <th className="px-5 py-3 font-medium" scope="col">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {auditLogs.map((auditLog) => {
            const absoluteDate = formatAuditAbsoluteDate(auditLog.createdAt);

            return (
              <tr className="align-top" key={auditLog.id}>
                <td className="px-5 py-4 font-medium text-foreground">
                  {getAuditActionLabel(auditLog.action)}
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{getAuditActorLabel(auditLog.actor)}</p>
                  {auditLog.actor?.email && (
                    <p className="mt-1 text-xs text-muted-foreground">{auditLog.actor.email}</p>
                  )}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {auditLog.entity
                    ? getAuditEntityTypeLabel(auditLog.entity.type)
                    : 'Non renseignée'}
                </td>
                <td className="px-5 py-4">
                  <AuditStatusBadge status={auditLog.status} />
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  <time dateTime={auditLog.createdAt} title={absoluteDate}>
                    {formatAuditRelativeDate(auditLog.createdAt)}
                  </time>
                  <p className="mt-1 text-xs">{absoluteDate}</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { AuditLogTable, AuditStatusBadge };
