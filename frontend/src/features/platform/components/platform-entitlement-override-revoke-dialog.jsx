import { useEffect, useState } from 'react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

/**
 * Confirmation partagée de révocation d'une dérogation Platform.
 *
 * Le composant possède la saisie et la validation locale du motif ; le parent
 * reste responsable de la mutation serveur et de l'erreur retournée par l'API.
 */
function PlatformEntitlementOverrideRevokeDialog({
  errorMessage = null,
  onCancel,
  onConfirm,
  override,
  pending = false,
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    setReason('');
    setValidationError(null);
  }, [override?.id]);

  function confirm() {
    const normalizedReason = reason.trim();

    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      setValidationError('Le motif de révocation doit contenir entre 3 et 500 caractères.');
      return;
    }

    setValidationError(null);
    onConfirm(normalizedReason);
  }

  return (
    <ConfirmationDialog
      confirmLabel="Révoquer"
      description={override
        ? `La dérogation de ${override.workspace?.name ?? 'ce workspace'} cessera d’être applicable. L’historique sera conservé.`
        : ''}
      errorMessage={validationError ?? errorMessage}
      onCancel={onCancel}
      onConfirm={confirm}
      open={Boolean(override)}
      pending={pending}
      pendingLabel="Révocation…"
      title="Révoquer la dérogation ?"
    >
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium" htmlFor="platform-override-revoke-reason">
          Motif de révocation
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="platform-override-revoke-reason"
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Pourquoi cette dérogation doit-elle être révoquée ?"
          value={reason}
        />
      </div>
    </ConfirmationDialog>
  );
}

export { PlatformEntitlementOverrideRevokeDialog };
