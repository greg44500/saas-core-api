const PRICE_FIELD_BY_BILLING_INTERVAL = Object.freeze({
  monthly: 'priceMonthlyExclTaxMinor',
  yearly: 'priceYearlyExclTaxMinor',
});

/**
 * Le filtrage améliore seulement l'UX. Le backend revalide le plan cible, son
 * prix, sa devise, la période et l'absence d'une transition concurrente au
 * moment de programmer réellement le downgrade.
 */
function getDowngradeCandidates({ plans = [], commercial }) {
  const priceField = PRICE_FIELD_BY_BILLING_INTERVAL[commercial?.billingInterval];

  if (!priceField || !commercial?.plan?.id) {
    return [];
  }

  const currentPlan = plans.find((plan) => plan.id === commercial.plan.id);
  const currentPrice = currentPlan?.[priceField];

  if (!Number.isInteger(currentPrice) || currentPrice < 0) {
    return [];
  }

  return plans
    .filter((plan) => {
      const targetPrice = plan?.[priceField];

      return plan?.id !== commercial.plan.id
        && plan?.key !== 'free'
        && plan?.currency === currentPlan.currency
        && Number.isInteger(targetPrice)
        && targetPrice >= 0
        && targetPrice < currentPrice;
    })
    .sort((left, right) => right[priceField] - left[priceField]);
}

export { getDowngradeCandidates, PRICE_FIELD_BY_BILLING_INTERVAL };
