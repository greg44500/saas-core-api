import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profileSchema } from '@/features/account/validation/account-schemas';
import {
  useGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
} from '@/features/auth/api/auth-api';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PlatformAccessSummary } from '@/features/platform/components/platform-access-summary';

function ProfilePage() {
  const { toast } = useToast();
  const { data: user, isError, isLoading, refetch } = useGetCurrentUserQuery();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const [updateCurrentUser, { isLoading: isSaving }] = useUpdateCurrentUserMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { dirtyFields, errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    if (!user) return;

    reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
  }, [reset, user]);

  const onSubmit = async (values) => {
    const payload = {};

    if (dirtyFields.firstName) payload.firstName = values.firstName;
    if (dirtyFields.lastName) payload.lastName = values.lastName;

    if (Object.keys(payload).length === 0) return;

    try {
      const updatedUser = await updateCurrentUser(payload).unwrap();
      reset({
        firstName: updatedUser.firstName ?? '',
        lastName: updatedUser.lastName ?? '',
      });
      toast({
        title: 'Profil mis à jour',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Mise à jour impossible',
        description: error?.data?.message ?? 'Impossible de mettre à jour le profil.',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement du profil…</p>;
  }

  if (isError || !user) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-destructive">Impossible de charger votre profil.</p>
        <Button onClick={() => refetch()} type="button" variant="outline">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Gérez les informations personnelles utilisées pour vous identifier dans l’application.
        </p>
        <PlatformAccessSummary
          label="Profil :"
          platformAccess={platformAccess}
          showRole={false}
          variant="inline"
        />
      </header>

      <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" label="Prénom" error={errors.firstName?.message}>
              <Input
                id="firstName"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName) || undefined}
                aria-describedby={errors.firstName ? 'firstName-message' : undefined}
                {...register('firstName')}
              />
            </FormField>

            <FormField id="lastName" label="Nom" error={errors.lastName?.message}>
              <Input
                id="lastName"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName) || undefined}
                aria-describedby={errors.lastName ? 'lastName-message' : undefined}
                {...register('lastName')}
              />
            </FormField>
          </div>

          <FormField
            id="accountEmail"
            label="Adresse email"
            hint="Le changement d’adresse email sera disponible avec un workflow de vérification dédié."
          >
            <Input id="accountEmail" type="email" value={user.email ?? ''} disabled readOnly />
          </FormField>

          <p className="text-sm text-muted-foreground">
            {user.emailVerifiedAt ? 'Adresse email vérifiée.' : 'Adresse email en attente de vérification.'}
          </p>

          <div className="flex justify-end">
            <Button disabled={!isDirty || isSaving} type="submit">
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export { ProfilePage };
