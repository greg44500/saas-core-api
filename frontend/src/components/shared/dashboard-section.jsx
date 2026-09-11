import { useId } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { cn } from '@/lib/utils';

/**
 * Structure réutilisable d'une section de dashboard.
 *
 * Le titre reste visible, tandis que l'explication contextuelle est disponible
 * à la demande via le tooltip canonique pour éviter de surcharger les écrans.
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h2 className="text-xl font-semibold" id={titleId}>{title}</h2>
            <InfoTooltip
              content={description}
              label={`À propos de ${title}`}
            />
          </div>
          {description && <span className="sr-only">{description}</span>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export { DashboardSection };
