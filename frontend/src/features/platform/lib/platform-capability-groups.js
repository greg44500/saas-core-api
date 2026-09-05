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
        metricKeys: Array.isArray(definition?.metricKeys)
          ? [...definition.metricKeys]
          : [],
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
 * Regroupe les capabilities pour l'UI à partir des métadonnées du backend.
 *
 * Une métrique liée à une feature via `metricKeys` est attachée à cette feature
 * même si plusieurs features partagent la même catégorie. Les métriques sans
 * relation explicite restent affichées comme limites autonomes de la catégorie.
 * Le frontend n'infère donc jamais une dépendance fonctionnelle depuis le nom
 * ou la catégorie d'une capability.
 */
function buildPlatformCapabilityGroups(capabilities) {
  const groups = new Map();
  const metricItems = buildPlatformMetricGroups(capabilities)
    .flatMap((group) => group.items);
  const metricsByKey = new Map(
    metricItems.map((metric) => [metric.key, metric]),
  );
  const assignedMetricKeys = new Set();

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
    const targetGroup = ensureGroup(group);

    targetGroup.features.push(
      ...group.items.map((feature) => {
        const relatedMetrics = feature.metricKeys
          .map((metricKey) => metricsByKey.get(metricKey))
          .filter(Boolean);

        relatedMetrics.forEach((metric) => {
          assignedMetricKeys.add(metric.key);
        });

        return {
          ...feature,
          metrics: relatedMetrics,
        };
      }),
    );
  }

  for (const group of buildPlatformMetricGroups(capabilities)) {
    const standaloneMetrics = group.items.filter(
      (metric) => !assignedMetricKeys.has(metric.key),
    );

    if (standaloneMetrics.length === 0) continue;

    ensureGroup(group).metrics.push(...standaloneMetrics);
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
