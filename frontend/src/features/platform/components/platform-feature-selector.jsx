import { useMemo } from 'react';

import { GroupedSearchSelect } from '@/components/shared/grouped-search-select';
import { formatPlatformPlanFeature } from '@/features/platform/lib/platform-plan-formatters';

function PlatformFeatureSelector({
  definitions = [],
  featureKeys = [],
  onChange,
  value,
}) {
  const definitionsByKey = useMemo(
    () => new Map(definitions.map((definition) => [definition.key, definition])),
    [definitions],
  );

  const groups = useMemo(() => {
    const grouped = new Map();

    featureKeys.forEach((featureKey) => {
      const definition = definitionsByKey.get(featureKey) ?? {
        key: featureKey,
        label: formatPlatformPlanFeature(featureKey),
        description: null,
        category: 'other',
        categoryLabel: 'Autres',
        displayOrder: 1000,
      };
      const groupKey = definition.category ?? 'other';

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: groupKey,
          label: definition.categoryLabel ?? 'Autres',
          order: definition.categoryDisplayOrder ?? 1000,
          items: [],
        });
      }

      grouped.get(groupKey).items.push({
        value: definition.key,
        label: definition.label,
        description: definition.description ?? null,
        order: definition.displayOrder ?? 1000,
      });
    });

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort(
          (left, right) =>
            left.order - right.order
            || left.label.localeCompare(right.label, 'fr'),
        ),
      }))
      .sort((left, right) =>
        left.order - right.order
        || left.label.localeCompare(right.label, 'fr'),
      );
  }, [definitionsByKey, featureKeys]);

  return (
    <GroupedSearchSelect
      emptyMessage="Aucune fonctionnalité ne correspond à cette recherche."
      groups={groups}
      id="override-feature"
      label="Fonctionnalité"
      onValueChange={onChange}
      placeholder="Sélectionner une fonctionnalité"
      searchPlaceholder="Nom, domaine ou usage…"
      value={value}
    />
  );
}

export { PlatformFeatureSelector };
