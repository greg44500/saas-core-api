import { MetricCard } from '@/components/data-display/metric-card';
import { formatPlatformPlanPrice } from '@/features/platform/lib/platform-plan-formatters';

const numberFormatter = new Intl.NumberFormat('fr-FR');

function formatCount(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : '—';
}

function formatMrrEstimate(estimate) {
  const byCurrency = estimate?.byCurrency ?? [];

  if (byCurrency.length === 0) return '—';
  if (byCurrency.length > 1) return `${byCurrency.length} devises`;

  const [{ amountMinor, currency }] = byCurrency;
  return formatPlatformPlanPrice(amountMinor, currency);
}

/**
 * Présente uniquement les KPI économiques déjà calculés côté backend. Le
 * frontend n'infère jamais la nature Free/Paid/Trial à partir du nom d'un Plan.
 */
function PlatformEconomicKpiCards({ kpis }) {
  const freeAccesses = kpis?.freeActiveAccesses;
  const invitedFreeCount = freeAccesses?.viaCommercialInvitation;

  return (
    <>
      <MetricCard
        description="Nombre de workspaces dont la Subscription effective est commerciale, active, valide et porte un prix contractuel strictement supérieur à zéro. Les trials sont exclus."
        title="Abonnements payants actifs"
        value={formatCount(kpis?.paidActiveSubscriptions)}
      />
      <MetricCard
        description="Nombre de workspaces dont l’accès effectif actif est gratuit : baseline Free ou offre commerciale privée gratuite durable. Les trials de plans payants sont exclus."
        title="Accès gratuits actifs"
        trend={Number.isFinite(invitedFreeCount)
          ? formatCount(invitedFreeCount)
          : null}
        trendLabel={Number.isFinite(invitedFreeCount)
          ? 'via invitation commerciale'
          : null}
        trendTone="neutral"
        value={formatCount(freeAccesses?.total)}
      />
      <MetricCard
        description="Équivalent mensuel brut des abonnements commerciaux actifs, calculé à partir des prix contractuels. Ce montant n’est ni facturé ni encaissé au sens comptable."
        title="Valeur mensuelle contractuelle estimée"
        value={formatMrrEstimate(kpis?.contractedMrrEstimate)}
      />
    </>
  );
}

export {
  PlatformEconomicKpiCards,
  formatCount as formatEconomicKpiCount,
  formatMrrEstimate as formatEconomicMrrEstimate,
};
