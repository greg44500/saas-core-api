import { Info } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Tooltip d'information transverse. Le composant conserve une API métier très
 * simple tout en déléguant focus, hover, portal et positionnement à la primitive
 * shadcn/Base UI canonique.
 */
function InfoTooltip({ content, label = 'Plus d’informations', className }) {
  if (!content) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <Info aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

export { InfoTooltip };
