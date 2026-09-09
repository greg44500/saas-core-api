import { cn } from '@/lib/utils';

/**
 * Primitive visuelle de chargement du Design System.
 *
 * Un Skeleton ne représente jamais une donnée réelle et reste donc ignoré par
 * les technologies d'assistance. Le conteneur appelant porte, si nécessaire,
 * l'annonce de chargement avec `role="status"` ou `aria-live`.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-muted motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
