import { formatSubscriptionDate, getTrialProgress } from '@/features/subscription/lib/subscription-formatters';

/**
 * Affiche une progression informative du trial actif.
 *
 * `active` doit provenir de l'entitlement effectif du backend. Le composant ne
 * déduit jamais lui-même qu'un statut `trialing` persistant donne encore accès
 * au plan commercial, car une date expirée peut déjà avoir provoqué un fallback
 * vers la baseline Free avant le passage d'un job de réconciliation.
 */
function TrialProgress({ active, startAt, endAt }) {
  if (!active) return null;

  const progress = getTrialProgress({ startAt, endAt });

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="trial-progress-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trial-progress-title" className="text-lg font-semibold">Période d’essai en cours</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fin prévue le {formatSubscriptionDate(endAt)}.
          </p>
        </div>
        {progress && (
          <p className="text-sm font-medium">
            {progress.remainingDays} jour{progress.remainingDays === 1 ? '' : 's'} restant{progress.remainingDays === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {progress && (
        <div className="mt-4 space-y-2">
          <div
            aria-label={`Progression de la période d’essai : ${progress.progressPercent} %`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.progressPercent}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La progression est informative ; les droits réels restent déterminés par le serveur.
          </p>
        </div>
      )}
    </section>
  );
}

export { TrialProgress };
