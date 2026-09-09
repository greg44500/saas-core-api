import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Composition de chargement alignée sur MetricCard afin de conserver sa
 * hauteur et limiter les changements de layout pendant une requête serveur.
 */
function MetricCardSkeleton({ className }) {
  return (
    <Card
      aria-live="polite"
      className={cn('flex h-full flex-col', className)}
      role="status"
    >
      <span className="sr-only">Chargement de l’indicateur…</span>
      <CardHeader className="min-h-16">
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end pt-4">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export { MetricCardSkeleton };
