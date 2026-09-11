import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Adaptateur de compatibilité pour les anciens appels `content + children`.
 *
 * Aucune mécanique de tooltip n'est implémentée ici : ouverture, focus,
 * positionnement, Escape, portal et accessibilité sont entièrement délégués à
 * la primitive shadcn/Base UI canonique. Les nouveaux composants doivent
 * importer directement `components/ui/tooltip`.
 */
function Tooltip({
  children,
  content,
  side = 'top',
  wrapperClassName,
}) {
  if (!content) return children;

  const resolvedSide = side === 'bottom-end' ? 'bottom' : side;
  const align = side === 'bottom-end' ? 'end' : 'center';

  return (
    <ShadcnTooltip>
      <TooltipTrigger
        render={<span className={cn('inline-flex', wrapperClassName)} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent align={align} side={resolvedSide}>
        {content}
      </TooltipContent>
    </ShadcnTooltip>
  );
}

export { Tooltip };
