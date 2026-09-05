import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useArchiveWorkspaceMutation } from '@/features/workspace/api/workspace-api';
import { createArchiveWorkspaceSchema } from '@/features/workspace/validation/workspace-schemas';

function WorkspaceArchiveSection({ workspace }) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveWorkspace, { isLoading }] = useArchiveWorkspaceMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createArchiveWorkspaceSchema(workspace.name)),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      currentPassword: '',
      confirmationName: '',
    },
  });

  const openDialog = () => {
    reset();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isLoading) return;
    setDialogOpen(false);
    reset();
  };

  const submitArchive = async ({ currentPassword, confirmationName }) => {
    try {
      await archiveWorkspace({
        workspaceId: workspace.id,
        currentPassword,
        confirmationName,
      }).unwrap();

      navigate('/workspaces', { replace: true });
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Impossible d’archiver ce workspace pour le moment.',
      });
    }
  };

  return (
    <section className="rounded-xl border border-destructive/40 bg-card p-5 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Zone sensible</p>
        <h2 className="text-lg font-semibold">Archiver ce workspace</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          L’archivage retire ce workspace des espaces utilisables. Les membres n’y auront plus accès,
          les abonnements commerciaux concernés seront neutralisés et les invitations en attente seront révoquées.
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Les données ne sont pas immédiatement supprimées et restent soumises aux règles de conservation,
          d’anonymisation et de suppression applicables au service.
        </p>
      </div>

      <div className="mt-4">
        <Button onClick={openDialog} type="button" variant="destructive">
          Archiver ce workspace
        </Button>
      </div>

      <ConfirmationDialog
        confirmLabel="Archiver définitivement ce workspace"
        description={`Pour confirmer, saisissez exactement « ${workspace.name} » puis votre mot de passe actuel.`}
        errorMessage={errors.root?.server?.message}
        onCancel={closeDialog}
        onConfirm={handleSubmit(submitArchive)}
        open={dialogOpen}
        pending={isLoading}
        pendingLabel="Archivage…"
        title="Confirmer l’archivage du workspace"
      >
        <div className="mt-5 space-y-4">
          <FormField
            error={errors.confirmationName?.message}
            id="workspaceArchiveConfirmationName"
            label="Nom du workspace"
          >
            <Input
              aria-describedby={errors.confirmationName ? 'workspaceArchiveConfirmationName-message' : undefined}
              aria-invalid={Boolean(errors.confirmationName)}
              autoComplete="off"
              id="workspaceArchiveConfirmationName"
              {...register('confirmationName')}
            />
          </FormField>

          <FormField
            error={errors.currentPassword?.message}
            id="workspaceArchiveCurrentPassword"
            label="Mot de passe actuel"
          >
            <PasswordField
              autoComplete="current-password"
              describedBy={errors.currentPassword ? 'workspaceArchiveCurrentPassword-message' : undefined}
              id="workspaceArchiveCurrentPassword"
              invalid={Boolean(errors.currentPassword)}
              {...register('currentPassword')}
            />
          </FormField>
        </div>
      </ConfirmationDialog>
    </section>
  );
}

export { WorkspaceArchiveSection };
