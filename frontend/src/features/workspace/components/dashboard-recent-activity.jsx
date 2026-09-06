import { useMemo } from 'react';
import { Link } from 'react-router';

import {
  createAuditMetadataLabelMaps,
  formatAuditAbsoluteDate,
  formatAuditRelativeDate,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditStatusLabel,
} from '@/features/audit-log/lib/audit-log-presentation';

function DashboardRecentActivity({
  workspaceId,
  entries,
  isLoading,
  isError,
  metadata,
}) {
  const auditLabelMaps = useMemo(
    () => createAuditMetadataLabelMaps(metadata),
    [metadata],
  );

  return (
    <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-lg font-semibold">Activité récente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les cinq derniers événements audités du workspace.
          </p>
        </div>
        {!isLoading && !isError && (
          <Link
            className="text-sm font-medium text-primary hover:underline"
            to={`/workspaces/${workspaceId}/activity`}
          >
            Voir tout
          </Link>
        )}
      </div>

      {isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Chargement de l’activité…</p>
      ) : isError ? (
        <p className="p-5 text-sm text-muted-foreground">
          L’activité récente est temporairement indisponible.
        </p>
      ) : entries.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Aucun événement récent.</p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry) => {
            const absoluteDate = formatAuditAbsoluteDate(entry.createdAt);

            return (
              <li className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between" key={entry.id}>
                <div>
                  <p className="font-medium text-foreground">
                    {getAuditActionLabel(entry.action, auditLabelMaps)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getAuditActorLabel(entry.actor)} · {getAuditStatusLabel(entry.status, auditLabelMaps)}
                  </p>
                </div>
                <time
                  className="text-xs text-muted-foreground sm:text-right"
                  dateTime={entry.createdAt}
                  title={absoluteDate}
                >
                  {formatAuditRelativeDate(entry.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export { DashboardRecentActivity };
