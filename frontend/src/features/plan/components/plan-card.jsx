import { formatMoneyFromMinor } from '@/utils/format-money';

/**
 * Carte de présentation du catalogue public. Les actions éventuelles restent
 * injectées par le contexte consommateur afin que l'onboarding, la page tarifaire
 * et la gestion d'abonnement ne partagent pas implicitement les mêmes droits.
 */
function PlanCard({ children = null, plan }) {
  const monthlyPrice = formatMoneyFromMinor(
    plan.priceMonthlyExclTaxMinor,
    plan.currency,
  );
  const yearlyPrice = formatMoneyFromMinor(
    plan.priceYearlyExclTaxMinor,
    plan.currency,
  );
  const hasTrial = plan.trialEnabled === true
    && Number.isInteger(plan.trialDurationDays)
    && plan.trialDurationDays > 0;

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
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

      {hasTrial && (
        <p className="text-sm font-medium text-primary">
          Essai disponible pendant {plan.trialDurationDays} jour{plan.trialDurationDays === 1 ? '' : 's'}
        </p>
      )}

      {children && <div className="mt-auto border-t border-border pt-4">{children}</div>}
    </article>
  );
}

export { PlanCard };
