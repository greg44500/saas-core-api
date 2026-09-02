import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateWorkspaceMutation } from '@/features/workspace/api/workspace-api';
import { getWorkspaceApiErrorMessage } from '@/features/workspace/lib/get-workspace-api-error-message';
import { updateWorkspaceSchema } from '@/features/workspace/validation/workspace-schemas';

function WorkspaceGeneralSettingsForm({ canUpdate, workspace }) {
  const { toast } = useToast();
  const [updateWorkspace, { isLoading }] = useUpdateWorkspaceMutation();
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(updateWorkspaceSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: workspace.name,
    },
  });

  useEffect(() => {
    reset({ name: workspace.name });
  }, [reset, workspace.name]);

  const onSubmit = async (values) => {
    try {
      const updatedWorkspace = await updateWorkspace({
        workspaceId: workspace.id,
        name: values.name,
      }).unwrap();

      reset({ name: updatedWorkspace?.name ?? values.name });
      toast({
        title: 'Nom du workspace mis à jour',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getWorkspaceApiErrorMessage(
          error,
          'Impossible de modifier le workspace pour le moment.',
        ),
        variant: 'error',
      });
    }
  };

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-6 text-card-foreground">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Informations générales</h2>
        <p className="text-sm text-muted-foreground">
          Modifiez les informations courantes du workspace. Les autorisations sont vérifiées à nouveau par le backend lors de l’enregistrement.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormField id="workspace-settings-name" label="Nom du workspace" error={errors.name?.message}>
          <Input
            aria-describedby={errors.name ? 'workspace-settings-name-message' : undefined}
            aria-invalid={Boolean(errors.name) || undefined}
            autoComplete="organization"
            disabled={!canUpdate || isLoading}
            id="workspace-settings-name"
            {...register('name')}
          />
        </FormField>

        <div className="flex justify-end">
          <Button disabled={!canUpdate || !isDirty || isLoading} type="submit">
            {isLoading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export { WorkspaceGeneralSettingsForm };
