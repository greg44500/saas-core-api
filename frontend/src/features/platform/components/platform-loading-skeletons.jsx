import { DataTableSkeleton } from '@/components/data-display/data-table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

function SkeletonCard({ lines = 2 }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="mt-3 h-8 w-1/2" />
      {Array.from({ length: Math.max(0, lines - 1) }, (_, index) => (
        <Skeleton
          className="mt-3 h-4 w-3/4"
          key={`line-${index}`}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton neutre utilisé pendant la résolution du contexte Plateforme.
 *
 * À ce stade les permissions ne sont pas encore connues : le rendu ne doit
 * donc révéler aucun nom de section ou fonctionnalité potentiellement interdite.
 */
function PlatformShellSkeleton() {
  return (
    <div
      aria-live="polite"
      className="min-h-screen bg-background px-6 py-8 text-foreground"
      role="status"
    >
      <span className="sr-only">Chargement de la Plateforme…</span>
      <div aria-hidden="true" className="mx-auto w-full max-w-7xl space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonCard key={`metric-${index}`} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de la vue d'ensemble une fois le contexte Plateforme autorisé.
 * Il reproduit les grandes masses du dashboard sans injecter de fausses données.
 */
function PlatformOverviewSkeleton() {
  return (
    <div aria-live="polite" className="space-y-8" role="status">
      <span className="sr-only">Chargement de la vue d’ensemble…</span>
      <div aria-hidden="true" className="space-y-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full max-w-3xl space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <div className="flex gap-3 lg:justify-end">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonCard key={`overview-metric-${index}`} />
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-56" />
          <div className="grid gap-4 xl:grid-cols-2">
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * Composition commune aux écrans Plateforme dont le contenu principal est un
 * tableau. Les écrans fournissent uniquement leur géométrie réelle afin de ne
 * pas dupliquer le comportement de chargement dans chaque domaine.
 */
function PlatformTablePageSkeleton({
  columns = 5,
  density = 'default',
  rows = 6,
  showAction = false,
  showFilters = false,
}) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full max-w-3xl space-y-3">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        {showAction && <Skeleton className="h-10 w-40" />}
      </header>

      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-28" />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="h-10 w-full" key={`filter-${index}`} />
            ))}
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <DataTableSkeleton columns={columns} density={density} rows={rows} />
        <div className="flex justify-between gap-4 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
      </section>
    </div>
  );
}

export {
  PlatformOverviewSkeleton,
  PlatformShellSkeleton,
  PlatformTablePageSkeleton,
};
