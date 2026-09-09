import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loader global neutre utilisé avant que le contexte applicatif soit résolu.
 *
 * Il ne doit révéler ni route, ni permission, ni donnée métier. Les formes
 * reproduisent seulement la structure générale d'un écran afin de limiter les
 * changements de layout pendant l'authentification ou le chargement d'une route.
 */
function PageLoader() {
  return (
    <div
      aria-live="polite"
      className="min-h-screen bg-background px-6 py-8 text-foreground"
      role="status"
    >
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true" className="mx-auto w-full max-w-6xl space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
              key={`loader-card-${index}`}
            >
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-3 h-8 w-1/2" />
              <Skeleton className="mt-3 h-4 w-3/4" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export { PageLoader };
