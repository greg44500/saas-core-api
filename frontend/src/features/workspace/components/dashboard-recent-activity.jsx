import { useMemo } from 'react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  onRetry,
}) {
  const auditLabelMaps = useMemo(
    () => createAuditMetadataLabelMaps(metadata),
    [metadata],
  );

  return (
    <Card>
      <CardHeader className="border-b border-border pb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Activité récente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les cinq derniers événements audités du workspace.
            </p>
          </div>
          {!isLoading && !isError && (
            <Link
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              to={`/workspaces/${workspaceId}/activity`}
            >
              Voir tout
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <RecentActivitySkeleton />
        ) : isError ? (
          <ErrorState
            className="p-5"
            description="L’activité récente n’a pas pu être chargée."
            onRetry={onRetry}
            title="Activité indisponible"
          />
        ) : entries.length === 0 ? (
          <EmptyState
            className="p-5"
            description="Les nouveaux événements audités apparaîtront ici."
            title="Aucun événement récent"
          />
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
      </CardContent>
    </Card>
  );
}

function RecentActivitySkeleton() {
  return (
    <div aria-live="polite" role="status">
      <span className="sr-only">Chargement de l’activité récente…</span>
      <div aria-hidden="true" className="divide-y divide-border">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="flex items-start justify-between gap-4 p-5" key={index}>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { DashboardRecentActivity, RecentActivitySkeleton };
