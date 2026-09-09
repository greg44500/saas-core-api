import { useState } from 'react';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';
import { DistributionBarChart } from '@/components/data-display/distribution-bar-chart';
import { DashboardSection } from '@/components/shared/dashboard-section';
import { MetricDrilldownButton } from '@/components/shared/metric-drilldown-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { useGetPlatformTeamSummaryQuery } from '@/features/platform/api/platform-team-api';
import { PlatformTeamMembersDrawer } from '@/features/platform/components/platform-team-members-drawer';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const numberFormatter = new Intl.NumberFormat('fr-FR');

function formatTeamCount(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : '—';
}

function PlatformTeamSnapshotSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const canReadTeam = platformAccess?.permissions?.includes(
    PLATFORM_PERMISSION.TEAM_READ,
  ) === true;
  const summaryQuery = useGetPlatformTeamSummaryQuery(undefined, {
    skip: !canReadTeam,
  });

  if (!canReadTeam) {
    return null;
  }

  let snapshotCard;
  const isInitialSummaryLoading = summaryQuery.isLoading
    || (summaryQuery.isFetching && summaryQuery.data === undefined);

  if (isInitialSummaryLoading) {
    snapshotCard = (
      <CollapsibleCard
        description="Synthèse des membres internes actuels de la Plateforme."
        summary={(
          <div aria-live="polite" role="status">
            <span className="sr-only">Chargement de l’équipe…</span>
            <div
              aria-hidden="true"
              className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <div className="space-y-2" key={`team-metric-${index}`}>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-9 w-28" />
          </div>
        )}
        title="Équipe de la Plateforme"
      />
    );
  } else if (summaryQuery.error) {
    snapshotCard = (
      <CollapsibleCard
        description="Synthèse des membres internes actuels de la Plateforme."
        summary={(
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              Impossible de charger le résumé de l’équipe.
            </p>
            <Button
              onClick={summaryQuery.refetch}
              size="sm"
              type="button"
              variant="outline"
            >
              Réessayer
            </Button>
          </div>
        )}
        title="Équipe de la Plateforme"
      />
    );
  } else {
    const summary = summaryQuery.data ?? {
      total: 0,
      active: 0,
      suspended: 0,
      founderCount: 0,
      byRole: [],
    };
    const distributionItems = (summary.byRole ?? []).map((item) => ({
      key: item.role?.id ?? item.role?.key ?? item.role?.name,
      label: item.role?.name ?? 'Rôle indisponible',
      value: item.total,
      percentage: item.percentage,
    }));

    snapshotCard = (
      <CollapsibleCard
        description="Effectif actuel de l’équipe interne, statut des accès et répartition par rôle de Plateforme."
        summary={(
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Membres</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {formatTeamCount(summary.total)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Actifs</dt>
                <dd className="mt-1 font-semibold">
                  {formatTeamCount(summary.active)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Suspendus</dt>
                <dd className="mt-1 font-semibold">
                  {formatTeamCount(summary.suspended)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fondateur</dt>
                <dd className="mt-1 font-semibold">
                  {formatTeamCount(summary.founderCount)}
                </dd>
              </div>
            </dl>

            <MetricDrilldownButton
              ariaLabel="Voir le détail de l’équipe de la Plateforme"
              disabled={summary.total <= 0}
              onClick={() => setDrawerOpen(true)}
              value="Voir l’équipe"
            />
          </div>
        )}
        title="Équipe de la Plateforme"
      >
        <DistributionBarChart
          aria-label="Répartition de l’équipe de la Plateforme par rôle"
          emptyMessage="Aucun rôle représenté dans l’équipe actuelle."
          formatValue={(item) => (
            `${formatTeamCount(item.value)} membre${item.value === 1 ? '' : 's'}`
          )}
          items={distributionItems}
        />
      </CollapsibleCard>
    );
  }

  return (
    <>
      <DashboardSection
        description="Suivez l’effectif interne et la répartition des responsabilités de l’équipe qui administre la Plateforme."
        title="Organisation interne"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshotCard}
        </div>
      </DashboardSection>

      <PlatformTeamMembersDrawer
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      />
    </>
  );
}

export {
  PlatformTeamSnapshotSection,
  formatTeamCount,
};
