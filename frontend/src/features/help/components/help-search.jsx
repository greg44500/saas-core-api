import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Autocomplete,
  AutocompleteClear,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteStatus,
} from '@/components/ui/autocomplete';
import { searchHelpEntries } from '@/features/help/lib/help-search';

function HelpSearch({ entries, onSelect }) {
  const [query, setQuery] = useState('');
  const suggestions = useMemo(
    () => searchHelpEntries(entries, query, 5),
    [entries, query],
  );

  return (
    <Autocomplete
      autoHighlight
      filter={null}
      items={suggestions}
      itemToStringValue={(entry) => entry.title}
      limit={5}
      onValueChange={setQuery}
      value={query}
    >
      <AutocompleteInputGroup>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        />
        <AutocompleteInput
          aria-label="Rechercher dans le centre d’aide"
          placeholder="Rechercher une question ou une action…"
        />
        <AutocompleteClear aria-label="Effacer la recherche">
          <X aria-hidden="true" className="size-4" />
        </AutocompleteClear>
      </AutocompleteInputGroup>

      <AutocompletePortal>
        <AutocompletePositioner>
          <AutocompletePopup className="border-primary/25 bg-popover/95 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-md">
            <div className="border-b border-border bg-muted/35 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggestions
              </p>
            </div>
            <AutocompleteStatus>
              {suggestions.length} résultat(s) proposé(s)
            </AutocompleteStatus>
            <AutocompleteEmpty>
              {query.trim()
                ? 'Aucune aide disponible pour cette recherche.'
                : 'Saisissez une question ou une action.'}
            </AutocompleteEmpty>
            <AutocompleteList>
              {(entry, index) => (
                <AutocompleteItem
                  className="border-b border-border/50 last:border-b-0 data-highlighted:bg-accent/70"
                  index={index}
                  key={entry.id}
                  onClick={() => onSelect(entry)}
                  value={entry}
                >
                  <span className="font-medium">{entry.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {entry.summary}
                  </span>
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        </AutocompletePositioner>
      </AutocompletePortal>
    </Autocomplete>
  );
}

export { HelpSearch };
