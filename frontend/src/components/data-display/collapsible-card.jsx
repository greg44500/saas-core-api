import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Carte avec un résumé toujours visible et un détail facultatif dépliable.
 *
 * Le contenu secondaire reste volontairement optionnel : les KPI simples ne
 * doivent pas devenir interactifs sans raison. Ce composant est réservé aux
 * sections où la divulgation progressive améliore réellement la lisibilité.
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
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {children && (
            <Button
              aria-controls={contentId}
              aria-expanded={open}
              className="shrink-0"
              onClick={() => setOpen((current) => !current)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {open ? closeLabel : openLabel}
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
