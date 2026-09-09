import { Skeleton } from '@/components/ui/skeleton';

function SubscriptionSectionSkeleton({ rows = 3 }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <Skeleton className="h-5 w-44" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex items-center justify-between gap-4" key={`subscription-row-${index}`}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanCardsSkeleton({ announce = true, cards = 3 }) {
  const cardCount = Number.isInteger(cards) && cards > 0 ? cards : 1;

  return (
    <div
      aria-live={announce ? 'polite' : undefined}
      role={announce ? 'status' : undefined}
    >
      {announce && <span className="sr-only">Chargement des offres…</span>}
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cardCount }, (_, index) => (
          <article
            className="flex min-h-56 flex-col gap-4 rounded-xl border border-border bg-card p-5"
            key={`plan-card-${index}`}
          >
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-3/5" />
            <div className="mt-auto border-t border-border pt-4">
              <Skeleton className="h-9 w-36" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/**
 * Composition du premier chargement de la page Abonnement.
 *
 * La page possède plusieurs zones métier indépendantes ; cette composition
 * reproduit leurs grandes masses sans inventer de données commerciales.
 */
function WorkspaceSubscriptionSkeleton() {
  return (
    <div aria-live="polite" className="space-y-6" role="status">
      <span className="sr-only">Chargement de l’abonnement…</span>
      <div aria-hidden="true" className="space-y-6">
        <header className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </header>

        <SubscriptionSectionSkeleton rows={4} />
        <SubscriptionSectionSkeleton rows={5} />
        <SubscriptionSectionSkeleton rows={2} />

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <PlanCardsSkeleton announce={false} />
        </section>
      </div>
    </div>
  );
}

export { PlanCardsSkeleton, WorkspaceSubscriptionSkeleton };
