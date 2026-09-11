import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function normalizeSearch(value) {
  return String(value ?? '')
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sélecteur générique pour des catalogues volumineux organisés par groupes.
 * La recherche reste externe au popup afin de conserver un comportement
 * prévisible avec le composant Select et une navigation clavier accessible.
 */
function GroupedSearchSelect({
  emptyMessage = 'Aucun élément ne correspond à cette recherche.',
  groups = [],
  id,
  label,
  onValueChange,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  value,
}) {
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    const needle = normalizeSearch(search.trim());

    if (!needle) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => normalizeSearch([
          item.label,
          item.description,
          group.label,
        ].filter(Boolean).join(' ')).includes(needle)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const items = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => ({
      label: item.label,
      value: item.value,
    }))),
    [groups],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${id}-search`}>
          Rechercher {label.toLocaleLowerCase('fr-FR')}
        </label>
        <Input
          id={`${id}-search`}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={search}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" id={`${id}-label`}>
          {label}
        </label>
        <Select
          items={items}
          onValueChange={(nextValue) => {
            if (typeof nextValue === 'string') onValueChange(nextValue);
          }}
          value={value || null}
        >
          <SelectTrigger
            aria-labelledby={`${id}-label`}
            id={id}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filteredGroups.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : filteredGroups.map((group, groupIndex) => (
              <div key={group.key ?? group.label}>
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((item) => (
                    <SelectItem
                      aria-label={item.description
                        ? `${item.label}. ${item.description}`
                        : item.label}
                      key={item.value}
                      title={item.description ?? undefined}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {groupIndex < filteredGroups.length - 1 && <SelectSeparator />}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export { GroupedSearchSelect, normalizeSearch };
