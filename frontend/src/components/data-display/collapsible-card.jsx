import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Carte avec un résumé toujours visible et un détail facultatif dépliable.
 *
 * Le résumé et le détail doivent apporter deux niveaux d'information distincts :
 * ouvrir la carte ne doit pas simplement répéter ce qui est déjà visible. Les
 * explications longues sont déplacées dans un tooltip pour préserver l'espace.
 *
 * Le détail reste monté pendant la transition afin que l'ouverture ET la
 * fermeture puissent être animées sans hauteur fixe. `inert` et `aria-hidden`
 * empêchent toutefois le contenu replié de devenir interactif ou accessible au
 * clavier. La variante `motion-reduce` respecte le choix système de réduire les
 * animations.
 */
function CollapsibleCard({
  title,
  description,
  summary,
  children,
  defaultOpen = false,
  className,
  openLabel = 'Afficher le détail',
  closeLabel = 'Masquer le détail',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-2">
            <CardTitle>{title}</CardTitle>
            <InfoTooltip content={description} label={`À propos de ${title}`} />
          </div>
          {children && (
            <Button
              aria-controls={contentId}
              aria-expanded={open}
              aria-label={open ? closeLabel : openLabel}
              className="shrink-0"
              onClick={() => setOpen((current) => !current)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'transition-transform duration-300 ease-out motion-reduce:transition-none',
                  open && 'rotate-180',
                )}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      {summary && <CardContent>{summary}</CardContent>}

      {children && (
        <div
          aria-hidden={!open}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
            open
              ? 'grid-rows-[1fr] opacity-100'
              : 'pointer-events-none grid-rows-[0fr] opacity-0',
          )}
          data-state={open ? 'open' : 'closed'}
          id={contentId}
          inert={open ? undefined : true}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                'border-t border-border px-5 transition-[padding] duration-300 ease-out motion-reduce:transition-none',
                open ? 'py-4' : 'py-0',
              )}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export { CollapsibleCard };
