import { useEffect, useState } from 'react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { Textarea } from '@/components/ui/textarea';

/**
 * La révocation exige un motif explicite afin de rester cohérente avec l'audit
 * backend. La saisie reste locale au dialog ; seule la mutation serveur vit
 * dans la page orchestratrice.
 */
function CommercialInvitationRevokeDialog({
  errorMessage = null,
  invitation,
  onCancel,
  onConfirm,
  pending = false,
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    setReason('');
    setValidationError(null);
  }, [invitation?.id]);

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
      description={invitation
        ? `Le lien envoyé à ${invitation.email} sera immédiatement inutilisable. Une invitation déjà acceptée n’est jamais concernée par cette action.`
        : ''}
      errorMessage={validationError ?? errorMessage}
      onCancel={onCancel}
      onConfirm={confirm}
      open={Boolean(invitation)}
      pending={pending}
      pendingLabel="Révocation…"
      title="Révoquer l’invitation ?"
    >
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium" htmlFor="commercial-invitation-revoke-reason">
          Motif de révocation
        </label>
        <Textarea
          id="commercial-invitation-revoke-reason"
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Pourquoi cette invitation doit-elle être révoquée ?"
          value={reason}
        />
      </div>
    </ConfirmationDialog>
  );
}

export { CommercialInvitationRevokeDialog };
