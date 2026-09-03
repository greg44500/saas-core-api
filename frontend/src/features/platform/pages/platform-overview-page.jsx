import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';
import { MetricCard } from '@/components/data-display/metric-card';
import { DashboardSection } from '@/components/shared/dashboard-section';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGetPlatformOverviewQuery } from '@/features/platform/api/platform-overview-api';
import { PlatformOverviewPeriodFilter } from '@/features/platform/components/platform-overview-period-filter';
import {
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
  formatPlatformPlanPrice,
} from '@/features/platform/lib/platform-plan-formatters';
import {
  readOverviewPeriod,
  resolveOverviewApiPeriod,
  writeOverviewPeriodSearchParams,
} from '@/features/platform/lib/platform-overview-period';

const numberFormatter = new Intl.NumberFormat('fr-FR');

function formatCount(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : '—';
}

function formatTrend(changePercent) {
  if (!Number.isFinite(changePercent)) {
    return {
      trend: null,
      trendLabel: 'Comparaison indisponible',
      trendTone: 'neutral',
    };
  }

  const sign = changePercent > 0 ? '+' : '';

  return {
    trend: `${sign}${numberFormatter.format(changePercent)} %`,
    trendLabel: 'vs période précédente',
    trendTone: changePercent > 0
      ? 'positive'
      : changePercent < 0
        ? 'negative'
        : 'neutral',
  };
}

function formatMrrEstimate(estimate) {
  const byCurrency = estimate?.byCurrency ?? [];

  if (byCurrency.length === 0) return '—';
  if (byCurrency.length > 1) return `${byCurrency.length} devises`;

  const [{ amountMinor, currency }] = byCurrency;
  return formatPlatformPlanPrice(amountMinor, currency);
}

function OverviewPanel({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PlatformOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = useMemo(
    () => readOverviewPeriod(searchParams),
    [searchParams],
  );
  const queryPeriod = useMemo(
    () => resolveOverviewApiPeriod(period),
    [period],
  );
  const overviewQuery = useGetPlatformOverviewQuery(queryPeriod, {
    refetchOnMountOrArgChange: true,
  });
  const overview = overviewQuery.data;

  function changePeriod(nextPeriod) {
    setSearchParams(writeOverviewPeriodSearchParams(nextPeriod));
  }

  const userTrend = formatTrend(overview?.kpis?.users?.changePercent);
  const workspaceTrend = formatTrend(overview?.kpis?.workspaces?.changePercent);
  const usage = overview?.usage ?? [];
  const planDistribution = overview?.planDistribution ?? [];
  const attention = overview?.attention;

  return (
    <div className="space-y-8" aria-busy={overviewQuery.isFetching || undefined}>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Plateforme</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Vue d’ensemble</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Analyse globale de l’activité, des abonnements et de la santé de la plateforme.
          </p>
          {overview?.generatedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Dernière actualisation : {new Intl.DateTimeFormat('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(overview.generatedAt))}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <PlatformOverviewPeriodFilter
            disabled={overviewQuery.isFetching}
            onChange={changePeriod}
            period={period}
          />
          <Button
            className="self-start lg:self-auto"
            disabled={overviewQuery.isFetching}
            onClick={overviewQuery.refetch}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RefreshCw aria-hidden="true" />
            {overviewQuery.isFetching ? 'Actualisation…' : 'Actualiser'}
          </Button>
        </div>
      </header>

      {overviewQuery.isError && (
        <Card>
          <CardContent>
            <p className="font-medium text-destructive" role="alert">
              Impossible de charger la vue d’ensemble de la plateforme.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les données précédemment affichées, si elles existent, ne doivent pas être considérées comme à jour.
            </p>
          </CardContent>
        </Card>
      )}

      <section
        aria-label="Indicateurs principaux"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          description="Comptes inscrits sur la plateforme"
          title="Utilisateurs"
          value={formatCount(overview?.kpis?.users?.total)}
          {...userTrend}
        />
        <MetricCard
          description="Tenants clients créés"
          title="Espaces de travail"
          value={formatCount(overview?.kpis?.workspaces?.total)}
          {...workspaceTrend}
        />
        <MetricCard
          description="Contrats commerciaux actuellement actifs"
          title="Abonnements actifs"
          value={formatCount(overview?.kpis?.activeCommercialSubscriptions)}
        />
        <MetricCard
          description="Estimation contractuelle brute, distincte des encaissements"
          title="MRR contractuel estimé"
          value={formatMrrEstimate(overview?.kpis?.contractedMrrEstimate)}
        />
      </section>

      <DashboardSection
        description="Suivez la progression de la plateforme et la structure du parc client sur la période sélectionnée."
        title="Croissance et répartition"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <OverviewPanel
            description="Les courbes temporelles seront ajoutées dans le lot graphique suivant."
            title="Croissance de la plateforme"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Nouveaux utilisateurs</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {formatCount(overview?.kpis?.users?.createdInPeriod)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Nouveaux espaces de travail</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {formatCount(overview?.kpis?.workspaces?.createdInPeriod)}
                </dd>
              </div>
            </dl>
          </OverviewPanel>

          <OverviewPanel
            description="Nombre et pourcentage des espaces de travail par plan effectif."
            title="Répartition par plan"
          >
            {planDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune répartition disponible.</p>
            ) : (
              <dl className="space-y-3">
                {planDistribution.map((item) => (
                  <div className="flex items-center justify-between gap-4" key={item.plan.id ?? item.plan.key}>
                    <dt className="text-sm font-medium">{item.plan.name}</dt>
                    <dd className="text-sm text-muted-foreground">
                      {formatCount(item.workspaceCount)} · {numberFormatter.format(item.percentage)} %
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </OverviewPanel>
        </div>
      </DashboardSection>

      <DashboardSection
        description="Les informations secondaires restent accessibles sans surcharger la lecture initiale."
        title="Santé et exploitation"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <CollapsibleCard
            description="Consommation agrégée des métriques déclarées par l’application."
            summary={(
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {usage.slice(0, 2).map((metric) => (
                  <div key={metric.key}>
                    <dt className="text-muted-foreground">
                      {formatPlatformPlanMetric(metric.key)}
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {formatPlatformPlanLimit(metric.key, metric.value)}
                    </dd>
                  </div>
                ))}
                {usage.length === 0 && (
                  <div>
                    <dt className="text-muted-foreground">Métriques</dt>
                    <dd className="mt-1 font-semibold">—</dd>
                  </div>
                )}
              </dl>
            )}
            title="Usage de la plateforme"
          >
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune métrique d’usage disponible.</p>
            ) : (
              <dl className="space-y-3 text-sm">
                {usage.map((metric) => (
                  <div className="flex justify-between gap-4" key={metric.key}>
                    <dt className="text-muted-foreground">
                      {formatPlatformPlanMetric(metric.key)}
                    </dt>
                    <dd className="font-medium">
                      {formatPlatformPlanLimit(metric.key, metric.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CollapsibleCard>

          <CollapsibleCard
            description="Échéances commerciales et exceptions nécessitant une surveillance."
            summary={(
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Trials à échéance</dt>
                  <dd className="mt-1 font-semibold">
                    {formatCount(overview?.subscriptionHealth?.trialsExpiringNext7Days)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dérogations actives</dt>
                  <dd className="mt-1 font-semibold">
                    {formatCount(overview?.overrides?.active)}
                  </dd>
                </div>
              </dl>
            )}
            title="Échéances et exceptions"
          >
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Résiliations programmées</dt>
                <dd className="font-medium">{formatCount(overview?.subscriptionHealth?.cancellationScheduled)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Downgrades programmés</dt>
                <dd className="font-medium">{formatCount(overview?.subscriptionHealth?.downgradeScheduled)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Dérogations programmées</dt>
                <dd className="font-medium">{formatCount(overview?.overrides?.scheduled)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Dérogations expirant sous 7 jours</dt>
                <dd className="font-medium">{formatCount(overview?.overrides?.expiringNext7Days)}</dd>
              </div>
            </dl>
          </CollapsibleCard>
        </div>
      </DashboardSection>

      <DashboardSection
        description="Synthèse des signaux administratifs actuellement identifiés ; le tableau détaillé partagé viendra dans le lot dédié."
        title="Points nécessitant une attention"
      >
        <Card>
          <CardContent>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signaux détectés</p>
                <p className="mt-1 text-3xl font-semibold">
                  {formatCount(attention?.totalSignals)}
                </p>
              </div>
              <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <dt className="text-muted-foreground">Past due</dt>
                  <dd className="font-semibold">{formatCount(attention?.counts?.pastDueSubscriptions)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Workspaces suspendus</dt>
                  <dd className="font-semibold">{formatCount(attention?.counts?.suspendedWorkspaces)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Audits en échec</dt>
                  <dd className="font-semibold">{formatCount(attention?.counts?.failedAuditEvents)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Trials proches</dt>
                  <dd className="font-semibold">{formatCount(attention?.counts?.trialsExpiringNext7Days)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dérogations proches</dt>
                  <dd className="font-semibold">{formatCount(attention?.counts?.overridesExpiringNext7Days)}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      </DashboardSection>
    </div>
  );
}

export {
  OverviewPanel,
  PlatformOverviewPage,
  formatCount,
  formatMrrEstimate,
  formatTrend,
};
