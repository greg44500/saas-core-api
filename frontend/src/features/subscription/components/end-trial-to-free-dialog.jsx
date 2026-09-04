import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

/**
 * Confirme une transition irréversible du point de vue de l'éligibilité : le
 * retour vers le plan baseline arrête immédiatement la période d'essai et ne
 * redonne jamais droit à un nouvel essai pour la même identité.
 */
function EndTrialToFreeDialog({
  baselinePlanName = null,
  errorMessage,
  onCancel,
  onConfirm,
  open,
  pending,
}) {
  const targetLabel = baselinePlanName
    ? `au plan ${baselinePlanName}`
    : 'au plan de référence';

  return (
    <ConfirmationDialog
      confirmLabel={`Mettre fin à l’essai et revenir ${targetLabel}`}
      confirmVariant="destructive"
      description={(
        <>
          La période d’essai prendra fin immédiatement. Votre éligibilité restera consommée :
          vous ne pourrez pas démarrer un nouvel essai avec cette identité.
        </>
      )}
      errorMessage={errorMessage}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open={open}
      pending={pending}
      title={`Revenir ${targetLabel} ?`}
    />
  );
}

export { EndTrialToFreeDialog };
