import { Info } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * Affiche une explication courte au survol ou au focus clavier sans occuper
 * l'espace permanent de la carte. Le contenu reste relié au déclencheur par
 * `aria-describedby`, afin que l'information ne dépende jamais de la souris.
 */
function InfoTooltip({ content, label = 'Plus d’informations', className }) {
  const tooltipId = useId();

  if (!content) return null;

  return (
    <span className={cn('group relative inline-flex shrink-0', className)}>
      <button
        aria-describedby={tooltipId}
        aria-label={label}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      <span
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

export { InfoTooltip };
