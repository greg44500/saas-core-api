import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCloseCurrentAccountMutation,
  useLazyGetAccountClosureImpactQuery,
} from '@/features/account/api/account-api';
import { accountClosureFormSchema } from '@/features/account/validation/account-schemas';

function AccountClosureImpact({ impact }) {
  const workspacesToArchive = impact?.workspacesToArchive ?? [];
  const memberOnlyWorkspaces = impact?.memberOnlyWorkspaces ?? [];
  const summary = impact?.summary ?? {};

  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
        <p className="font-medium text-foreground">Conséquences de la fermeture</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Votre compte et toutes vos sessions seront fermés.
          </li>
          <li>
            {summary.membershipRemovalCount ?? 0} appartenance(s) à des workspaces seront retirées.
          </li>
          <li>
            {summary.workspaceArchiveCount ?? 0} workspace(s) dont vous êtes propriétaire seront archivés.
          </li>
          {(summary.otherActiveMemberCount ?? 0) > 0 && (
            <li>
              {summary.otherActiveMemberCount} autre(s) membre(s) perdront l’accès aux workspaces archivés.
            </li>
          )}
          {(summary.affectedSubscriptionCount ?? 0) > 0 && (
            <li>
              {summary.affectedSubscriptionCount} abonnement(s) commercial(aux) lié(s) à ces workspaces seront neutralisés.
            </li>
          )}
        </ul>
      </div>

      {workspacesToArchive.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Workspaces qui seront archivés</p>
          <ul className="space-y-2">
            {workspacesToArchive.map((workspace) => (
              <li
                className="rounded-md border border-border bg-muted/30 px-3 py-2"
                key={workspace.id}
              >
                <span className="font-medium text-foreground">{workspace.name}</span>
                <span className="ml-2 text-muted-foreground">
                  {workspace.otherActiveMemberCount > 0
                    ? `${workspace.otherActiveMemberCount} autre(s) membre(s) impacté(s)`
                    : 'aucun autre membre actif'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {memberOnlyWorkspaces.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Workspaces qui resteront actifs</p>
          <p className="text-muted-foreground">
            Vous perdrez uniquement votre accès à ces workspaces ; ils ne seront pas archivés.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {memberOnlyWorkspaces.map((workspace) => (
              <li key={workspace.id}>{workspace.name}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="rounded-md border border-border bg-muted/30 p-3 text-muted-foreground">
        Les données ne sont pas immédiatement supprimées. Elles restent soumises aux règles de conservation,
        d’anonymisation et de suppression applicables au service.
      </p>
    </div>
  );
}

function AccountClosureSection({ currentUserEmail = '' }) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [impactError, setImpactError] = useState(null);
  const [loadClosureImpact, {
    data: closureImpact,
    isFetching: isLoadingImpact,
  }] = useLazyGetAccountClosureImpactQuery();
  const [closeCurrentAccount, { isLoading: isClosingAccount }] = useCloseCurrentAccountMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountClosureFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      currentPassword: '',
      confirmationEmail: '',
      confirmAccountClosure: false,
    },
  });

  const openClosureDialog = async () => {
    setImpactError(null);

    try {
      await loadClosureImpact(undefined, false).unwrap();
      reset();
      setDialogOpen(true);
    } catch (error) {
      setImpactError(
        error?.data?.message
        ?? 'Impossible d’analyser les conséquences de la fermeture pour le moment.',
      );
    }
  };

  const closeClosureDialog = () => {
    if (isClosingAccount) return;
    setDialogOpen(false);
    reset();
  };

  const submitClosure = async (values) => {
    try {
      await closeCurrentAccount(values).unwrap();
      navigate('/login', { replace: true });
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Impossible de fermer le compte pour le moment.',
      });
    }
  };

  return (
    <section className="rounded-xl border border-destructive/40 bg-card p-5 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Zone sensible</p>
        <h2 className="text-lg font-semibold">Fermer mon compte</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cette action ferme votre accès à la plateforme. Avant toute confirmation, nous vous présenterons
          les conséquences réelles sur vos workspaces, vos appartenances et les autres membres concernés.
        </p>
      </div>

      {impactError && (
        <p className="mt-3 text-sm text-destructive" role="alert">{impactError}</p>
      )}

      <div className="mt-4">
        <Button
          disabled={isLoadingImpact}
          onClick={openClosureDialog}
          type="button"
          variant="destructive"
        >
          {isLoadingImpact ? 'Analyse des conséquences…' : 'Fermer mon compte'}
        </Button>
      </div>

      <ConfirmationDialog
        confirmLabel="Fermer définitivement mon compte"
        description="Vérifiez les conséquences puis confirmez votre identité et votre intention."
        errorMessage={errors.root?.server?.message}
        onCancel={closeClosureDialog}
        onConfirm={handleSubmit(submitClosure)}
        open={dialogOpen}
        pending={isClosingAccount}
        pendingLabel="Fermeture…"
        title="Confirmer la fermeture du compte"
      >
        <AccountClosureImpact impact={closureImpact} />

        <div className="mt-5 space-y-4">
          <FormField
            error={errors.confirmationEmail?.message}
            id="closureConfirmationEmail"
            label="Adresse email du compte"
          >
            <Input
              aria-invalid={Boolean(errors.confirmationEmail)}
              autoComplete="email"
              id="closureConfirmationEmail"
              placeholder={currentUserEmail || 'vous@exemple.fr'}
              {...register('confirmationEmail')}
            />
          </FormField>

          <FormField
            error={errors.currentPassword?.message}
            id="closureCurrentPassword"
            label="Mot de passe actuel"
          >
            <PasswordField
              autoComplete="current-password"
              describedBy={errors.currentPassword ? 'closureCurrentPassword-message' : undefined}
              id="closureCurrentPassword"
              invalid={Boolean(errors.currentPassword)}
              {...register('currentPassword')}
            />
          </FormField>

          <div className="space-y-1">
            <label className="flex items-start gap-3 text-sm" htmlFor="confirmAccountClosure">
              <input
                className="mt-1 h-4 w-4 rounded border-border accent-destructive"
                id="confirmAccountClosure"
                type="checkbox"
                {...register('confirmAccountClosure')}
              />
              <span>
                Je comprends que cette fermeture met fin à mon accès et applique les conséquences listées ci-dessus.
              </span>
            </label>
            {errors.confirmAccountClosure && (
              <p className="text-sm text-destructive" role="alert">
                {errors.confirmAccountClosure.message}
              </p>
            )}
          </div>
        </div>
      </ConfirmationDialog>
    </section>
  );
}

export { AccountClosureImpact, AccountClosureSection };
