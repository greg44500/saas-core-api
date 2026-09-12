import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Coquille de recherche réutilisable pour les topbars applicatives.
 *
 * Le Core ne connaît volontairement aucune source métier. Les applications
 * dérivées pourront brancher leur moteur via `onSearch` sans coupler ce
 * composant de présentation aux données recherchées.
 */
function ExpandableSearch({
  ariaLabel = 'Recherche globale',
  className,
  onSearch,
  placeholder = 'Rechercher…',
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function openSearch() {
    setExpanded(true);
  }

  function submitSearch(event) {
    event.preventDefault();

    if (!expanded) {
      openSearch();
      return;
    }

    const normalizedQuery = query.trim();
    if (normalizedQuery && onSearch) onSearch(normalizedQuery);
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape') return;

    setExpanded(false);
    inputRef.current?.blur();
  }

  function handleBlur(event) {
    const focusRemainsInside = event.currentTarget.contains(event.relatedTarget);
    if (!focusRemainsInside && query.trim() === '') setExpanded(false);
  }

  return (
    <form
      aria-label={ariaLabel}
      className={cn(
        'relative flex h-10 shrink-0 items-center overflow-hidden rounded-md border border-input bg-background',
        'transition-[width,box-shadow] duration-300 ease-out motion-reduce:transition-none',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        expanded ? 'w-56 md:w-64 lg:w-72' : 'w-10',
        className,
      )}
      onBlur={handleBlur}
      onSubmit={submitSearch}
      role="search"
    >
      <Button
        aria-expanded={expanded}
        aria-label={expanded ? 'Lancer la recherche' : 'Ouvrir la recherche'}
        className="absolute left-0 top-0 z-10 rounded-none"
        onClick={expanded ? undefined : openSearch}
        size="icon"
        type={expanded ? 'submit' : 'button'}
        variant="ghost"
      >
        <Search aria-hidden="true" />
      </Button>

      {expanded && (
        <Input
          aria-label={ariaLabel}
          className="h-10 border-0 bg-transparent pl-10 pr-3 focus-visible:ring-0 focus-visible:ring-offset-0"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          type="search"
          value={query}
        />
      )}
    </form>
  );
}

export { ExpandableSearch };
