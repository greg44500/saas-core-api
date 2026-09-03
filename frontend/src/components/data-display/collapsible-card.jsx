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
                  'transition-transform duration-200',
                  open && 'rotate-180',
                )}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      {summary && <CardContent>{summary}</CardContent>}

      {children && open && (
        <div
          className="border-t border-border px-5 py-4"
          id={contentId}
        >
          {children}
        </div>
      )}
    </Card>
  );
}

export { CollapsibleCard };
