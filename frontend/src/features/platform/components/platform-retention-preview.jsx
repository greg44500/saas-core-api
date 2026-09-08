import { useState } from 'react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRetentionDate } from '@/features/platform/lib/platform-retention';

function PreviewMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PlatformRetentionPreview({
  canExecute,
  canPreview,
  executionPending,
  onExecute,
  onPreview,
  policy,
  preview,
  previewPending,
  runtime,
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState('');
  const [confirmationError, setConfirmationError] = useState(null);

  const manualAllowed = policy?.config?.enabled === true
    && policy?.config?.manualExecutionEnabled === true;
  const executeDisabled = !preview
    || !canExecute
    || !manualAllowed
    || runtime?.locked === true;

  async function handleConfirm() {
    const expectedPhrase = preview?.confirmation?.phrase;

    if (!expectedPhrase || confirmationValue !== expectedPhrase) {
      setConfirmationError('La phrase saisie ne correspond pas à la confirmation fournie par la preview.');
      return;
    }

    setConfirmationError(null);

    try {
      await onExecute(confirmationValue);
      setConfirmationValue('');
      setConfirmationOpen(false);
    } catch {
      // La page présente déjà l'erreur backend via le toast partagé.
      // Garder le dialogue ouvert évite de faire croire que la purge a réussi.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canPreview && (
          <Button
            disabled={!policy || previewPending}
            onClick={onPreview}
            type="button"
            variant="outline"
          >
            {previewPending ? 'Prévisualisation…' : 'Prévisualiser la purge'}
          </Button>
        )}

        {canExecute && (
          <Button
            disabled={executeDisabled}
            onClick={() => {
              setConfirmationError(null);
              setConfirmationValue('');
              setConfirmationOpen(true);
            }}
            type="button"
            variant="destructive"
          >
            Purger les éléments prévisualisés
          </Button>
        )}
      </div>

      {!canPreview && (
        <p className="text-sm text-muted-foreground">
          Votre rôle permet la consultation de la policy, mais pas sa prévisualisation.
        </p>
      )}

      {runtime?.locked && (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Une exécution est actuellement verrouillée jusqu’au {formatRetentionDate(runtime.lockExpiresAt)}.
        </p>
      )}

      {preview && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <h3 className="font-semibold text-foreground">Impact calculé par le backend</h3>
            <p className="text-sm text-muted-foreground">
              Cutoff serveur : {formatRetentionDate(preview.cutoffAt)}. Le frontend ne fournit jamais cette date.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PreviewMetric label="Éligibles" value={preview.eligibleCount} />
            <PreviewMetric label="Maximum ce run" value={preview.maxAffectedThisRun} />
            <PreviewMetric label="Lots estimés" value={preview.estimatedBatches} />
            <PreviewMetric label="Taille de lot" value={preview.batchSize} />
          </div>

          {preview.truncated && (
            <p className="text-sm text-muted-foreground">
              Le nombre total d’éléments éligibles dépasse la borne de cette exécution. Les exécutions suivantes poursuivront le traitement.
            </p>
          )}
        </div>
      )}

      <ConfirmationDialog
        confirmLabel="Confirmer la purge"
        description="Cette action détruit définitivement les AuditLogs éligibles. La preview sera recalculée côté serveur avant l’exécution."
        errorMessage={confirmationError}
        onCancel={() => {
          setConfirmationOpen(false);
          setConfirmationError(null);
          setConfirmationValue('');
        }}
        onConfirm={handleConfirm}
        open={confirmationOpen}
        pending={executionPending}
        pendingLabel="Purge en cours…"
        title="Confirmer la purge définitive"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Saisissez exactement : <strong className="text-foreground">{preview?.confirmation?.phrase}</strong>
          </p>
          <Input
            aria-label="Phrase de confirmation de purge"
            autoComplete="off"
            onChange={(event) => {
              setConfirmationValue(event.target.value);
              setConfirmationError(null);
            }}
            value={confirmationValue}
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
}

export { PlatformRetentionPreview };
