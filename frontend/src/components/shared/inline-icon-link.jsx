import { ExternalLink } from 'lucide-react';

import { Tooltip } from '@/components/shared/tooltip';
import { cn } from '@/lib/utils';

/**
 * Action de navigation compacte à placer à côté d'une valeur ou d'un nom.
 * Le libellé reste accessible aux lecteurs d'écran et visible au survol via le tooltip.
 */
function InlineIconLink({
  className,
  Icon = ExternalLink,
  label,
  onClick,
}) {
  return (
    <Tooltip content={label}>
      <button
        aria-label={label}
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
        onClick={onClick}
        type="button"
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </button>
    </Tooltip>
  );
}

export { InlineIconLink };
