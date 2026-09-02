import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  useRevokeWorkspaceCancellationMutation,
  useRevokeWorkspaceDowngradeMutation,
  useScheduleWorkspaceCancellationMutation,
  useScheduleWorkspaceDowngradeMutation,
} from '@/features/subscription/api/subscription-api';
import { getDowngradeCandidates } from '@/features/subscription/lib/commercial-lifecycle';
import {
  cancellationReasonSchema,
  downgradeTargetSchema,
} from '@/features/subscription/lib/commercial-lifecycle.schemas';
import { formatSubscriptionDate } from '@/features/subscription/lib/subscription-formatters';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function CommercialLifecycleSection({
  commercial,
  isOwner,
  onFeedback,
  plans,
  workspaceId,
}) {
  const [dialogMode, setDialogMode] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [targetPlanId, setTargetPlanId] = useState('');
  const [validationMessage, setValidationMessage] = useState(null);

  const [scheduleCancellation, scheduleCancellationMutation] =
    useScheduleWorkspaceCancellationMutation();
  const [revokeCancellation, revokeCancellationMutation] =
    useRevokeWorkspaceCancellationMutation();
  const [scheduleDowngrade, scheduleDowngradeMutation] =
    useScheduleWorkspaceDowngradeMutation();
  const [revokeDowngrade, revokeDowngradeMutation] =
    useRevokeWorkspaceDowngradeMutation();

  const downgradeCandidates = useMemo(
    () => getDowngradeCandidates({ plans, commercial }),
    [plans, commercial],
  );

  if (!isOwner || commercial?.status !== 'active') {
    return null;
  }

  const pending = scheduleCancellationMutation.isLoading
    || revokeCancellationMutation.isLoading
    || scheduleDowngradeMutation.isLoading
    || revokeDowngradeMutation.isLoading;
  const effectiveDate = formatSubscriptionDate(commercial.currentPeriodEnd);
  const scheduledDowngrade = commercial.scheduledChange?.type === 'downgrade'
    ? commercial.scheduledChange
    : null;

  function closeDialog() {
    if (pending) return;
    setDialogMode(null);
    setCancellationReason('');
    setTargetPlanId('');
    setValidationMessage(null);
  }

  function openDowngradeDialog() {
    setValidationMessage(null);
    setTargetPlanId(downgradeCandidates[0]?.id ?? '');
    setDialogMode('downgrade');
  }

  async function handleScheduleCancellation() {
    const validation = cancellationReasonSchema.safeParse(cancellationReason);

    if (!validation.success) {
      setValidationMessage(validation.error.issues[0]?.message ?? 'Le motif est invalide.');
      return;
    }

    setValidationMessage(null);

    try {
      await scheduleCancellation({
        workspaceId,
        subscriptionId: commercial.id,
        reason: validation.data,
      }).unwrap();
      closeDialog();
      onFeedback({
        type: 'success',
        message: `La résiliation est programmée pour le ${effectiveDate}.`,
      });
    } catch (error) {
      onFeedback({
        type: 'error',
        message: getApiMessage(error, 'La résiliation n’a pas pu être programmée.'),
      });
    }
  }

  async function handleRevokeCancellation() {
    try {
      await revokeCancellation({
        workspaceId,
        subscriptionId: commercial.id,
      }).unwrap();
      closeDialog();
      onFeedback({
        type: 'success',
        message: 'La résiliation programmée a été annulée.',
      });
    } catch (error) {
      onFeedback({
        type: 'error',
        message: getApiMessage(error, 'La résiliation programmée n’a pas pu être annulée.'),
      });
    }
  }

  async function handleScheduleDowngrade() {
    const validation = downgradeTargetSchema.safeParse(targetPlanId);

    if (!validation.success) {
      setValidationMessage(validation.error.issues[0]?.message ?? 'Le plan cible est invalide.');
      return;
    }

    const targetPlan = downgradeCandidates.find((plan) => plan.id === validation.data);

    if (!targetPlan) {
      setValidationMessage('Le plan cible n’est plus disponible dans les offres proposées.');
      return;
    }

    setValidationMessage(null);

    try {
      await scheduleDowngrade({
        workspaceId,
        subscriptionId: commercial.id,
        targetPlanId: targetPlan.id,
      }).unwrap();
      closeDialog();
      onFeedback({
        type: 'success',
        message: `Le passage vers ${targetPlan.name} est programmé pour le ${effectiveDate}.`,
      });
    } catch (error) {
      onFeedback({
        type: 'error',
        message: getApiMessage(error, 'Le changement de plan n’a pas pu être programmé.'),
      });
    }
  }

  async function handleRevokeDowngrade() {
    try {
      await revokeDowngrade({
        workspaceId,
        subscriptionId: commercial.id,
      }).unwrap();
      closeDialog();
      onFeedback({
        type: 'success',
        message: 'Le changement de plan programmé a été annulé.',
      });
    } catch (error) {
      onFeedback({
        type: 'error',
        message: getApiMessage(error, 'Le changement de plan programmé n’a pas pu être annulé.'),
      });
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5" aria-labelledby="commercial-lifecycle-title">
      <div>
        <h2 id="commercial-lifecycle-title" className="text-xl font-semibold">
          Gestion du contrat commercial
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les changements ci-dessous prennent effet à la fin de la période en cours, le {effectiveDate}.
        </p>
      </div>

      {commercial.cancelAtPeriodEnd && (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="font-medium">Résiliation programmée</p>
          <p className="mt-1 text-sm text-muted-foreground">
            L’abonnement restera actif jusqu’au {effectiveDate}, puis les droits reviendront à l’offre de référence applicable.
          </p>
          <Button
            className="mt-3"
            disabled={pending}
            onClick={() => setDialogMode('revoke-cancellation')}
            type="button"
            variant="outline"
          >
            Conserver mon abonnement
          </Button>
        </div>
      )}

      {scheduledDowngrade && (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="font-medium">Changement de plan programmé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Passage vers {scheduledDowngrade.targetPlan?.name ?? 'le plan sélectionné'} le{' '}
            {formatSubscriptionDate(scheduledDowngrade.effectiveAt)}.
          </p>
          <Button
            className="mt-3"
            disabled={pending}
            onClick={() => setDialogMode('revoke-downgrade')}
            type="button"
            variant="outline"
          >
            Annuler le changement programmé
          </Button>
        </div>
      )}

      {!commercial.cancelAtPeriodEnd && !scheduledDowngrade && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="font-medium">Résilier en fin de période</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun accès n’est interrompu immédiatement. La résiliation prendra effet le {effectiveDate}.
            </p>
            <Button
              className="mt-3"
              disabled={pending}
              onClick={() => setDialogMode('cancellation')}
              type="button"
              variant="outline"
            >
              Programmer la résiliation
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="font-medium">Passer à une offre inférieure</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Le changement prendra effet le {effectiveDate}. Le backend vérifiera à nouveau l’éligibilité du plan au moment de la demande.
            </p>
            {downgradeCandidates.length > 0 ? (
              <Button
                className="mt-3"
                disabled={pending}
                onClick={openDowngradeDialog}
                type="button"
                variant="outline"
              >
                Programmer un changement de plan
              </Button>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune offre inférieure compatible n’est actuellement proposée.
              </p>
            )}
          </div>
        </div>
      )}

      {dialogMode && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4" role="presentation">
          <section
            aria-labelledby="commercial-action-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl"
            role="dialog"
          >
            {dialogMode === 'cancellation' && (
              <>
                <div className="space-y-2">
                  <h3 id="commercial-action-title" className="text-lg font-semibold">
                    Programmer la résiliation ?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    L’abonnement restera actif jusqu’au {effectiveDate}. La résiliation ne prendra effet qu’à cette date.
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium" htmlFor="cancellation-reason">
                    Motif facultatif
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={pending}
                    id="cancellation-reason"
                    maxLength={500}
                    onChange={(event) => setCancellationReason(event.target.value)}
                    placeholder="Ex. : offre devenue inutile pour mon activité"
                    value={cancellationReason}
                  />
                </div>
              </>
            )}

            {dialogMode === 'downgrade' && (
              <>
                <div className="space-y-2">
                  <h3 id="commercial-action-title" className="text-lg font-semibold">
                    Programmer le changement de plan ?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Le plan sélectionné prendra effet le {effectiveDate}. Aucun prorata, remboursement ou crédit n’est calculé par ce module Subscription.
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium" htmlFor="downgrade-target-plan">
                    Offre cible
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={pending}
                    id="downgrade-target-plan"
                    onChange={(event) => setTargetPlanId(event.target.value)}
                    value={targetPlanId}
                  >
                    {downgradeCandidates.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {dialogMode === 'revoke-cancellation' && (
              <div className="space-y-2">
                <h3 id="commercial-action-title" className="text-lg font-semibold">
                  Conserver l’abonnement ?
                </h3>
                <p className="text-sm text-muted-foreground">
                  La résiliation programmée sera annulée et l’abonnement continuera au-delà du {effectiveDate}, sous réserve de son cycle contractuel normal.
                </p>
              </div>
            )}

            {dialogMode === 'revoke-downgrade' && (
              <div className="space-y-2">
                <h3 id="commercial-action-title" className="text-lg font-semibold">
                  Annuler le changement de plan ?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Le changement programmé sera retiré. Le plan commercial actuel restera inchangé à cette échéance.
                </p>
              </div>
            )}

            {validationMessage && (
              <p className="mt-3 text-sm text-destructive" role="alert">{validationMessage}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} onClick={closeDialog} type="button" variant="outline">
                Annuler
              </Button>
              <Button
                disabled={pending}
                onClick={
                  dialogMode === 'cancellation'
                    ? handleScheduleCancellation
                    : dialogMode === 'downgrade'
                      ? handleScheduleDowngrade
                      : dialogMode === 'revoke-cancellation'
                        ? handleRevokeCancellation
                        : handleRevokeDowngrade
                }
                type="button"
                variant={dialogMode === 'cancellation' ? 'destructive' : 'default'}
              >
                {pending
                  ? 'Traitement…'
                  : dialogMode === 'cancellation'
                    ? 'Confirmer la résiliation'
                    : dialogMode === 'downgrade'
                      ? 'Confirmer le changement'
                      : dialogMode === 'revoke-cancellation'
                        ? 'Conserver l’abonnement'
                        : 'Annuler le changement'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export { CommercialLifecycleSection };
