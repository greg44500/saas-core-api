import { useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * Structure réutilisable d'une section de dashboard.
 *
 * Le composant centralise la relation titre/description/action/contenu sans
 * imposer la nature des widgets affichés. Les pages restent responsables de
 * l'assemblage, tandis que la hiérarchie visuelle reste homogène.
 */
function DashboardSection({
  title,
  description,
  action,
  children,
  className,
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('space-y-4', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold" id={titleId}>{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export { DashboardSection };
