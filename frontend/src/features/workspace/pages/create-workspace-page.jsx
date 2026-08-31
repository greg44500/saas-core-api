import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCreateWorkspaceMutation,
  useListWorkspacesQuery,
} from '@/features/workspace/api/workspace-api';
import { createWorkspaceSchema } from '@/features/workspace/validation/workspace-schemas';

function CreateWorkspacePage() {
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const {
    data: workspaces = [],
    isLoading: isLoadingWorkspaces,
    isError: isWorkspaceListError,
    refetch,
  } = useListWorkspacesQuery();
  const [createWorkspace, { isLoading: isCreating }] = useCreateWorkspaceMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(createWorkspaceSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { name: '' },
  });

  const onSubmit = async (values) => {
    try {
      const workspace = await createWorkspace(values).unwrap();
      setCreatedWorkspace(workspace);
    } catch {
      setError('root.server', {
        type: 'server',
        message: 'Impossible de créer votre espace pour le moment. Réessayez.',
      });
    }
  };

  if (createdWorkspace) {
    return (
      <section className="space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Espace créé</p>
          <h1 className="text-2xl font-semibold tracking-tight">{createdWorkspace.name} est prêt</h1>
          <p className="text-sm text-muted-foreground">
            Votre workspace dispose immédiatement de l’offre Free. Vous pouvez commencer à l’utiliser sans choisir de plan payant.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="font-medium">Plan actuel : Free</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucun trial n’a été démarré automatiquement.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="sm:flex-1">
            <Link to={`/workspaces/${createdWorkspace.id}/dashboard`}>Accéder à mon espace</Link>
          </Button>
          <Button asChild variant="outline" className="sm:flex-1">
            <Link to={`/onboarding/plans/${createdWorkspace.id}`}>Comparer les plans</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (isLoadingWorkspaces) {
    return <PageLoader />;
  }

  if (isWorkspaceListError) {
    return (
      <section className="space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Impossible de vérifier vos espaces</h1>
          <p className="text-sm text-muted-foreground">Réessayez avant de créer un nouvel espace.</p>
        </div>
        <Button type="button" onClick={refetch}>Réessayer</Button>
      </section>
    );
  }

  if (workspaces.length > 0) {
    return <Navigate to="/workspaces" replace />;
  }

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Premier espace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Créez votre workspace</h1>
        <p className="text-sm text-muted-foreground">
          Un nom suffit pour commencer. L’offre Free sera activée automatiquement par le backend.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="workspace-name" label="Nom du workspace" error={errors.name?.message}>
          <Input
            id="workspace-name"
            autoComplete="organization"
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? 'workspace-name-message' : undefined}
            {...register('name')}
          />
        </FormField>

        {errors.root?.server && (
          <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>
        )}

        <Button className="w-full" type="submit" disabled={isCreating}>
          {isCreating ? 'Création…' : 'Créer mon espace'}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Aucun moyen de paiement n’est demandé et aucun essai n’est lancé automatiquement.
      </p>
    </section>
  );
}

export { CreateWorkspacePage };
