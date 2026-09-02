import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

/**
 * Confirme une transition irréversible du point de vue de l'éligibilité : le
 * retour vers Free arrête immédiatement la période d'essai et ne redonne jamais
 * droit à un nouvel essai pour la même identité.
 */
function EndTrialToFreeDialog({ onCancel, onConfirm, open, pending }) {
  return (
    <ConfirmationDialog
      confirmLabel="Mettre fin à l’essai et revenir à Free"
      confirmVariant="destructive"
      description={(
        <>
          La période d’essai prendra fin immédiatement. Votre éligibilité restera consommée :
          vous ne pourrez pas démarrer un nouvel essai avec cette identité.
        </>
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open={open}
      pending={pending}
      title="Revenir au plan Free ?"
    />
  );
}

export { EndTrialToFreeDialog };
