import {
  formatPlatformPlanFeature,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

function groupByCategory(items) {
  const groups = new Map();

  for (const item of items) {
    const category = item.category ?? 'other';
    const categoryLabel = item.categoryLabel ?? 'Autres';

    if (!groups.has(category)) {
      groups.set(category, {
        key: category,
        label: categoryLabel,
        items: [],
      });
    }

    groups.get(category).items.push(item);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (left, right) =>
          (left.displayOrder ?? 1000) - (right.displayOrder ?? 1000)
          || left.label.localeCompare(right.label, 'fr'),
      ),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'fr'));
}

/**
 * Construit les sections de features uniquement depuis les clés réellement
 * enregistrées dans le registre actif. Les métadonnées sont facultatives afin
 * qu'un nouveau module reste visible même avant d'avoir enrichi son affichage.
 */
function buildPlatformFeatureGroups(capabilities) {
  const features = capabilities?.features ?? [];
  const definitionsByKey = new Map(
    (capabilities?.featureDefinitions ?? []).map(
      (definition) => [definition.key, definition],
    ),
  );

  return groupByCategory(
    features.map((key) => {
      const definition = definitionsByKey.get(key);

      return {
        key,
        label: definition?.label ?? formatPlatformPlanFeature(key),
        description: definition?.description ?? null,
        category: definition?.category ?? 'other',
        categoryLabel: definition?.categoryLabel ?? 'Autres',
        displayOrder: definition?.displayOrder ?? 1000,
        tags: definition?.tags ?? [],
      };
    }),
  );
}

function buildPlatformMetricGroups(capabilities) {
  const metrics = capabilities?.metrics ?? [];

  return groupByCategory(
    metrics.map((metric) => ({
      ...metric,
      label:
        metric.presentation?.label
        ?? formatPlatformPlanMetric(metric.key),
      description: metric.presentation?.description ?? null,
      category: metric.presentation?.category ?? 'other',
      categoryLabel: metric.presentation?.categoryLabel ?? 'Autres',
      displayOrder: metric.presentation?.displayOrder ?? 1000,
      unit: metric.presentation?.unit ?? null,
    })),
  );
}

/**
 * Regroupe pour l'UI les fonctionnalités et métriques qui partagent une même
 * catégorie de présentation. Cette composition n'introduit aucune dépendance
 * métier entre elles : elle évite seulement de séparer artificiellement dans
 * le formulaire de Plan une fonctionnalité de ses quotas voisins.
 */
function buildPlatformCapabilityGroups(capabilities) {
  const groups = new Map();

  function ensureGroup(group) {
    if (!groups.has(group.key)) {
      groups.set(group.key, {
        key: group.key,
        label: group.label,
        features: [],
        metrics: [],
      });
    }

    return groups.get(group.key);
  }

  for (const group of buildPlatformFeatureGroups(capabilities)) {
    ensureGroup(group).features.push(...group.items);
  }

  for (const group of buildPlatformMetricGroups(capabilities)) {
    ensureGroup(group).metrics.push(...group.items);
  }

  return [...groups.values()].sort(
    (left, right) => left.label.localeCompare(right.label, 'fr'),
  );
}

export {
  buildPlatformCapabilityGroups,
  buildPlatformFeatureGroups,
  buildPlatformMetricGroups,
};
