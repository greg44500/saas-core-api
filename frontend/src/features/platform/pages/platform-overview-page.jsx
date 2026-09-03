import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { CollapsibleCard } from '@/components/data-display/collapsible-card';
import { ComparisonBarChart } from '@/components/data-display/comparison-bar-chart';
import { DistributionBarChart } from '@/components/data-display/distribution-bar-chart';
import { MetricCard } from '@/components/data-display/metric-card';
import { SignalSummaryCard } from '@/components/data-display/signal-summary-card';
import { DashboardSection } from '@/components/shared/dashboard-section';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGetPlatformOverviewQuery } from '@/features/platform/api/platform-overview-api';
import { PlatformOverviewPeriodFilter } from '@/features/platform/components/platform-overview-period-filter';
import {
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

function formatTrend(changePercent, trendLabel = 'vs période précédente') {
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
    trendLabel,
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

function formatBytes(value) {
  if (!Number.isFinite(value)) return '—';

  const units = [
    ['Go', 1024 ** 3],
    ['Mo', 1024 ** 2],
    ['Ko', 1024],
  ];
  const [unit, divisor] = units.find(([, threshold]) => value >= threshold)
    ?? ['octets', 1];

  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: divisor === 1 ? 0 : 1,
  }).format(value / divisor)} ${unit}`;
}

/**
 * Formate une consommation réelle sans lui appliquer la sémantique d'une
 * limite de Plan. Une valeur d'usage égale à zéro signifie bien `0`, alors
 * qu'une limite commerciale égale à zéro signifie "consommation interdite".
 */
function formatUsageValue(metricKey, value) {
  if (!Number.isFinite(value)) return '—';
  if (metricKey === 'storage_bytes') return formatBytes(value);
  return numberFormatter.format(value);
}

function formatFileTypeLabel(fileType) {
  const knownMimeLabels = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
  };

  if (knownMimeLabels[fileType.mimeType]) {
    return knownMimeLabels[fileType.mimeType];
  }

  const extension = fileType.extensions?.[0];
  return extension ? extension.toUpperCase() : fileType.mimeType;
}

function OverviewPanel({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-2">
          <CardTitle>{title}</CardTitle>
          <InfoTooltip content={description} label={`À propos de ${title}`} />
        </div>
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

  const userTrend = formatTrend(
    overview?.kpis?.users?.changePercent,
    'nouvelles inscriptions vs période précédente',
  );
  const workspaceTrend = formatTrend(
    overview?.kpis?.workspaces?.changePercent,
    'nouveaux espaces vs période précédente',
  );
  const usage = overview?.usage ?? [];
  const files = overview?.files ?? { totalCount: 0, totalSizeBytes: 0, byType: [] };
  const planDistribution = overview?.planDistribution ?? [];
  const attention = overview?.attention;
  const growthItems = [
    {
      key: 'users',
      label: 'Nouveaux utilisateurs',
      current: overview?.kpis?.users?.createdInPeriod ?? 0,
      previous: overview?.kpis?.users?.createdInPreviousPeriod ?? 0,
    },
    {
      key: 'workspaces',
      label: 'Nouveaux espaces de travail',
      current: overview?.kpis?.workspaces?.createdInPeriod ?? 0,
      previous: overview?.kpis?.workspaces?.createdInPreviousPeriod ?? 0,
    },
  ];
  const planDistributionItems = planDistribution.map((item) => ({
    key: item.plan.id ?? item.plan.key,
    label: item.plan.name,
    value: item.workspaceCount,
    percentage: item.percentage,
  }));
  const fileCountDistribution = files.byType.map((item) => ({
    key: item.mimeType,
    label: formatFileTypeLabel(item),
    value: item.count,
    percentage: item.percentageOfCount,
  }));
  const fileStorageDistribution = files.byType.map((item) => ({
    key: item.mimeType,
    label: formatFileTypeLabel(item),
    value: item.sizeBytes,
    percentage: item.percentageOfStorage,
  }));
  const attentionItems = [
    {
      key: 'past-due',
      label: 'Abonnements en retard',
      value: attention?.counts?.pastDueSubscriptions ?? 0,
      tone: 'warning',
    },
    {
      key: 'suspended-workspaces',
      label: 'Espaces de travail suspendus',
      value: attention?.counts?.suspendedWorkspaces ?? 0,
      tone: 'warning',
    },
    {
      key: 'failed-audits',
      label: 'Audits en échec',
      value: attention?.counts?.failedAuditEvents ?? 0,
      tone: 'warning',
    },
    {
      key: 'trials-expiring',
      label: 'Essais arrivant à échéance',
      value: attention?.counts?.trialsExpiringNext7Days ?? 0,
      tone: 'warning',
    },
    {
      key: 'overrides-expiring',
      label: 'Dérogations arrivant à échéance',
      value: attention?.counts?.overridesExpiringNext7Days ?? 0,
      tone: 'warning',
    },
  ];

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
          description="Nombre total de comptes inscrits sur la plateforme."
          title="Utilisateurs"
          value={formatCount(overview?.kpis?.users?.total)}
          {...userTrend}
        />
        <MetricCard
          description="Nombre total d’espaces de travail clients créés sur la plateforme."
          title="Espaces de travail"
          value={formatCount(overview?.kpis?.workspaces?.total)}
          {...workspaceTrend}
        />
        <MetricCard
          description="Nombre de contrats commerciaux actifs et encore valides à l’instant du calcul."
          title="Abonnements actifs"
          value={formatCount(overview?.kpis?.activeCommercialSubscriptions)}
        />
        <MetricCard
          description="Équivalent mensuel brut des abonnements commerciaux actifs, calculé à partir des prix contractuels. Ce montant n’est ni facturé ni encaissé au sens comptable."
          title="Valeur mensuelle contractuelle estimée"
          value={formatMrrEstimate(overview?.kpis?.contractedMrrEstimate)}
        />
      </section>

      <DashboardSection
        description="Suivez la progression de la plateforme et la structure du parc client sur la période sélectionnée."
        title="Croissance et répartition"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <OverviewPanel
            description="Compare les créations de la période sélectionnée avec la période précédente de même durée."
            title="Croissance de la plateforme"
          >
            <ComparisonBarChart
              aria-label="Comparaison de la croissance de la plateforme"
              items={growthItems}
            />
          </OverviewPanel>

          <OverviewPanel
            description="Nombre et pourcentage des espaces de travail par plan effectivement appliqué."
            title="Répartition par plan"
          >
            <DistributionBarChart
              aria-label="Répartition des espaces de travail par plan effectif"
              emptyMessage="Aucune répartition disponible."
              formatValue={(item) => `${formatCount(item.value)} espace${item.value === 1 ? '' : 's'}`}
              items={planDistributionItems}
            />
          </OverviewPanel>
        </div>
      </DashboardSection>

      <DashboardSection
        description="Les informations secondaires restent accessibles sans surcharger la lecture initiale."
        title="Santé et exploitation"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <CollapsibleCard
            description="Vue consolidée de la consommation fonctionnelle actuelle : membres, stockage, téléversements et répartition des fichiers actifs."
            summary={(
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {usage.slice(0, 2).map((metric) => (
                  <div key={metric.key}>
                    <dt className="text-muted-foreground">
                      {formatPlatformPlanMetric(metric.key)}
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {formatUsageValue(metric.key, metric.value)}
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
            <div className="space-y-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Fichiers actifs</dt>
                  <dd className="mt-1 font-semibold">{formatCount(files.totalCount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stockage des fichiers actifs</dt>
                  <dd className="mt-1 font-semibold">{formatBytes(files.totalSizeBytes)}</dd>
                </div>
              </dl>

              <div>
                <p className="mb-3 text-sm font-medium">Répartition par nombre de fichiers</p>
                <DistributionBarChart
                  aria-label="Répartition des fichiers actifs par type"
                  emptyMessage="Aucun fichier actif."
                  formatValue={(item) => `${formatCount(item.value)} fichier${item.value === 1 ? '' : 's'}`}
                  items={fileCountDistribution}
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Répartition du stockage par type</p>
                <DistributionBarChart
                  aria-label="Répartition du stockage des fichiers actifs par type"
                  emptyMessage="Aucun stockage de fichier actif."
                  formatValue={(item) => formatBytes(item.value)}
                  items={fileStorageDistribution}
                />
              </div>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            description="Échéances commerciales et dérogations nécessitant une surveillance."
            summary={(
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Essais à échéance</dt>
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
                <dt className="text-muted-foreground">Baisses de formule programmées</dt>
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
        <SignalSummaryCard
          description="Ces signaux nécessitent une vérification administrative, mais ne représentent pas automatiquement des incidents techniques critiques. Les valeurs non nulles sont signalées en avertissement."
          items={attentionItems}
          title="Synthèse des points d’attention"
          total={formatCount(attention?.totalSignals)}
        />
      </DashboardSection>
    </div>
  );
}

export {
  OverviewPanel,
  PlatformOverviewPage,
  formatBytes,
  formatCount,
  formatFileTypeLabel,
  formatMrrEstimate,
  formatTrend,
  formatUsageValue,
};
