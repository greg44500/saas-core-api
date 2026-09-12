import { DistributionBarChart } from '@/components/data-display/distribution-bar-chart';

const numberFormatter = new Intl.NumberFormat('fr-FR');

const ACCOUNT_STATUS_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'active', label: 'Comptes actifs' }),
  Object.freeze({ key: 'disabled', label: 'Comptes désactivés' }),
  Object.freeze({ key: 'deletionRequested', label: 'Suppression demandée' }),
]);

const ACCESS_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'active', label: 'Au moins un accès actif' }),
  Object.freeze({ key: 'suspendedOnly', label: 'Accès suspendus uniquement' }),
]);

const RELATIONSHIP_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'owner', label: 'Propriétaires d’au moins un espace' }),
  Object.freeze({ key: 'withoutOwnership', label: 'Membres sans propriété d’espace' }),
]);

function buildDistributionItems(source, definitions) {
  return definitions.map((definition) => ({
    ...definition,
    value: source?.[definition.key]?.count ?? 0,
    percentage: source?.[definition.key]?.percentage ?? 0,
  }));
}

function formatUserCount(item) {
  if (!Number.isFinite(item.value) || item.value === 0) return '—';

  return `${numberFormatter.format(item.value)} utilisateur${item.value > 1 ? 's' : ''}`;
}

function DistributionSection({ title, ariaLabel, items }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <DistributionBarChart
        aria-label={ariaLabel}
        formatValue={formatUserCount}
        items={items}
      />
    </section>
  );
}

/**
 * Présente les facettes de la population cliente calculées côté backend.
 *
 * Les catégories à zéro restent volontairement affichées : elles documentent
 * les états possibles du Core sans obliger l'administrateur à les découvrir au
 * fil des incidents ou changements de cycle de vie.
 */
function PlatformClientUserDistribution({ distributions }) {
  const accountStatusItems = buildDistributionItems(
    distributions?.accountStatus,
    ACCOUNT_STATUS_DEFINITIONS,
  );
  const accessItems = buildDistributionItems(
    distributions?.access,
    ACCESS_DEFINITIONS,
  );
  const relationshipItems = buildDistributionItems(
    distributions?.relationship,
    RELATIONSHIP_DEFINITIONS,
  );

  return (
    <div className="space-y-6">
      <DistributionSection
        ariaLabel="Répartition des utilisateurs clients par état du compte"
        items={accountStatusItems}
        title="État du compte"
      />
      <DistributionSection
        ariaLabel="Répartition des utilisateurs clients par état d’accès"
        items={accessItems}
        title="Accès aux espaces"
      />
      <DistributionSection
        ariaLabel="Répartition des utilisateurs clients selon la propriété des espaces"
        items={relationshipItems}
        title="Relation aux espaces"
      />
    </div>
  );
}

export {
  ACCESS_DEFINITIONS,
  ACCOUNT_STATUS_DEFINITIONS,
  PlatformClientUserDistribution,
  RELATIONSHIP_DEFINITIONS,
  buildDistributionItems,
  formatUserCount,
};
