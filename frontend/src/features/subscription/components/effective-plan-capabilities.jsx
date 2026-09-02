import {
  formatFeatureLabel,
  formatLimitLabel,
  formatPlanLimitValue,
} from '@/features/subscription/lib/subscription-formatters';

/**
 * Affiche les capabilities du plan déjà résolu par le backend.
 *
 * Le composant ne transforme jamais une feature ou une limite en décision
 * d'autorisation : il s'agit uniquement d'une vue informative du contrat Plan.
 */
function EffectivePlanCapabilities({ plan }) {
  const features = plan?.features ?? [];
  const limitEntries = Object.entries(plan?.limits ?? {});

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="effective-plan-capabilities-title">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Détails du plan</p>
        <h2 id="effective-plan-capabilities-title" className="mt-1 text-lg font-semibold">
          Fonctionnalités et limites
        </h2>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-medium">Fonctionnalités incluses</h3>
          {features.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune fonctionnalité spécifique n’est déclarée pour ce plan.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {features.map((featureKey) => (
                <li className="rounded-md bg-muted/50 px-3 py-2" key={featureKey}>
                  {formatFeatureLabel(featureKey)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-medium">Limites</h3>
          {limitEntries.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune limite chiffrée n’est déclarée pour ce plan.</p>
          ) : (
            <dl className="mt-3 divide-y divide-border rounded-md border border-border">
              {limitEntries.map(([limitKey, value]) => (
                <div className="flex items-center justify-between gap-4 px-3 py-2 text-sm" key={limitKey}>
                  <dt className="text-muted-foreground">{formatLimitLabel(limitKey)}</dt>
                  <dd className="font-medium">{formatPlanLimitValue(limitKey, value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

export { EffectivePlanCapabilities };
