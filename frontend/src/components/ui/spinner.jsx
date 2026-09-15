import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Indicateur de chargement visuel canonique du frontend.
 *
 * Le composant reste décoratif : le libellé ou le conteneur appelant porte le
 * message accessible décrivant l'opération réellement en cours.
 */
function Spinner({ className, ...props }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn(
        'size-4 animate-spin motion-reduce:animate-none',
        className,
      )}
      data-slot="spinner"
      {...props}
    />
  );
}

export { Spinner };
