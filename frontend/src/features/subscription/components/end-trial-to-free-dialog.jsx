import { Button } from '@/components/ui/button';

/**
 * Confirme une transition irréversible du point de vue de l'éligibilité : le
 * retour vers Free arrête immédiatement la période d'essai et ne redonne jamais
 * droit à un nouvel essai pour la même identité.
 */
function EndTrialToFreeDialog({ onCancel, onConfirm, open, pending }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4"
      role="presentation"
    >
      <section
        aria-labelledby="end-trial-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
        role="dialog"
      >
        <div className="space-y-2">
          <h2 id="end-trial-title" className="text-lg font-semibold">
            Revenir au plan Free ?
          </h2>
          <p className="text-sm text-muted-foreground">
            La période d’essai prendra fin immédiatement. Votre éligibilité restera consommée :
            vous ne pourrez pas démarrer un nouvel essai avec cette identité.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={pending}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {pending ? 'Traitement…' : 'Mettre fin à l’essai et revenir à Free'}
          </Button>
        </div>
      </section>
    </div>
  );
}

export { EndTrialToFreeDialog };
