import { formatMoneyFromMinor } from '@/utils/format-money';

function PlanCard({ plan }) {
  const monthlyPrice = formatMoneyFromMinor(
    plan.priceMonthlyExclTaxMinor,
    plan.currency,
  );
  const yearlyPrice = formatMoneyFromMinor(
    plan.priceYearlyExclTaxMinor,
    plan.currency,
  );

  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-medium">
          {monthlyPrice ?? 'Tarif mensuel non disponible'}
          {monthlyPrice && <span className="text-sm font-normal text-muted-foreground"> HT / mois</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          {yearlyPrice ? `${yearlyPrice} HT / an` : 'Tarif annuel non disponible'}
        </p>
      </div>
    </article>
  );
}

export { PlanCard };
