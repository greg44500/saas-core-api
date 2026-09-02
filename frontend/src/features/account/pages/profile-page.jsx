import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
} from '@/features/auth/api/auth-api';
import { profileSchema } from '@/features/account/validation/account-schemas';

function ProfilePage() {
  const { data: user, isError, isLoading, refetch } = useGetCurrentUserQuery();
  const [updateCurrentUser, { isLoading: isSaving }] = useUpdateCurrentUserMutation();
  const [successMessage, setSuccessMessage] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
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

    setSuccessMessage('');

    try {
      const updatedUser = await updateCurrentUser(payload).unwrap();
      reset({
        firstName: updatedUser.firstName ?? '',
        lastName: updatedUser.lastName ?? '',
      });
      setSuccessMessage('Profil mis à jour.');
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Impossible de mettre à jour le profil.',
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

          {errors.root?.server && (
            <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>
          )}
          {successMessage && (
            <p className="text-sm text-success" role="status">{successMessage}</p>
          )}

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
