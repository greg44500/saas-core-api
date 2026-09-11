import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatPlatformPlanFeature } from '@/features/platform/lib/platform-plan-formatters';

function normalizeSearch(value) {
  return value
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function PlatformFeatureSelector({
  definitions = [],
  featureKeys = [],
  onChange,
  value,
}) {
  const [search, setSearch] = useState('');

  const definitionsByKey = useMemo(
    () => new Map(definitions.map((definition) => [definition.key, definition])),
    [definitions],
  );

  const groupedFeatures = useMemo(() => {
    const normalizedSearch = normalizeSearch(search.trim());
    const groups = new Map();

    featureKeys.forEach((featureKey) => {
      const definition = definitionsByKey.get(featureKey) ?? {
        key: featureKey,
        label: formatPlatformPlanFeature(featureKey),
        description: null,
        category: 'other',
        categoryLabel: 'Autres',
        displayOrder: 1000,
        metricKeys: [],
      };
      const searchable = normalizeSearch([
        definition.label,
        definition.description,
        definition.categoryLabel,
      ].filter(Boolean).join(' '));

      if (normalizedSearch && !searchable.includes(normalizedSearch)) {
        return;
      }

      const groupKey = definition.category ?? 'other';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          label: definition.categoryLabel ?? 'Autres',
          order: definition.displayOrder ?? 1000,
          features: [],
        });
      }

      groups.get(groupKey).features.push(definition);
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        features: [...group.features].sort(
          (left, right) =>
            (left.displayOrder ?? 1000) - (right.displayOrder ?? 1000)
            || left.label.localeCompare(right.label, 'fr'),
        ),
      }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, 'fr'),
      );
  }, [definitionsByKey, featureKeys, search]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="override-feature-search">
          Rechercher une fonctionnalité
        </label>
        <Input
          id="override-feature-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nom, domaine ou usage…"
          type="search"
          value={search}
        />
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {groupedFeatures.length === 0 ? (
          <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Aucune fonctionnalité ne correspond à cette recherche.
          </p>
        ) : groupedFeatures.map((group) => (
          <section key={group.label} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h4>
            <div className="grid gap-2">
              {group.features.map((feature) => {
                const selected = feature.key === value;
                const metricCount = feature.metricKeys?.length ?? 0;

                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:bg-muted/50',
                    )}
                    key={feature.key}
                    onClick={() => onChange(feature.key)}
                    type="button"
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {feature.label}
                    </span>
                    {feature.description && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {feature.description}
                      </span>
                    )}
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {metricCount > 0
                        ? `${metricCount} limite${metricCount > 1 ? 's' : ''} associée${metricCount > 1 ? 's' : ''}`
                        : 'Aucune limite associée'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export { PlatformFeatureSelector };
