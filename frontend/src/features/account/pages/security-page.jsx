import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { Button } from '@/components/ui/button';
import { changePasswordFormSchema } from '@/features/account/validation/account-schemas';
import {
  useChangePasswordMutation,
  useGetCurrentUserQuery,
  useLogoutAllMutation,
} from '@/features/auth/api/auth-api';

function SecurityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const { data: currentUser } = useGetCurrentUserQuery();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [logoutAll, { isLoading: isLoggingOutAll }] = useLogoutAllMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onChangePassword = async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      navigate('/login', {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Impossible de modifier le mot de passe.',
      });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll().unwrap();
      navigate('/login', {
        replace: true,
        state: { sessionsRevoked: true },
      });
    } catch {
      setConfirmLogoutAll(false);
      setError('root.sessions', {
        type: 'server',
        message: 'Impossible de révoquer toutes les sessions pour le moment.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sécurité</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Gérez votre mot de passe et révoquez les sessions actives de votre compte.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
          <p className="text-sm text-muted-foreground">
            Après la modification, toutes vos sessions sont révoquées et une nouvelle connexion est requise.
          </p>
        </div>

        <form className="space-y-4" noValidate onSubmit={handleSubmit(onChangePassword)}>
          <FormField id="currentPassword" label="Mot de passe actuel" error={errors.currentPassword?.message}>
            <PasswordField
              id="currentPassword"
              autoComplete="current-password"
              invalid={Boolean(errors.currentPassword)}
              describedBy={errors.currentPassword ? 'currentPassword-message' : undefined}
              {...register('currentPassword')}
            />
          </FormField>

          <div className="-mt-2 text-right">
            <Link
              className="text-sm font-medium text-primary hover:underline"
              state={{
                email: currentUser?.email ?? '',
                returnTo: '/account/security',
                accountReturnTo: location.state?.accountReturnTo,
              }}
              to="/forgot-password"
            >
              Mot de passe actuel oublié ?
            </Link>
          </div>

          <FormField id="newPassword" label="Nouveau mot de passe" error={errors.newPassword?.message}>
            <PasswordField
              id="newPassword"
              autoComplete="new-password"
              invalid={Boolean(errors.newPassword)}
              describedBy={errors.newPassword ? 'newPassword-message' : undefined}
              {...register('newPassword')}
            />
          </FormField>

          <FormField
            id="confirmNewPassword"
            label="Confirmer le nouveau mot de passe"
            error={errors.confirmNewPassword?.message}
          >
            <PasswordField
              id="confirmNewPassword"
              autoComplete="new-password"
              invalid={Boolean(errors.confirmNewPassword)}
              describedBy={errors.confirmNewPassword ? 'confirmNewPassword-message' : undefined}
              {...register('confirmNewPassword')}
            />
          </FormField>

          {errors.root?.server && (
            <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>
          )}

          <div className="flex justify-end">
            <Button disabled={isChangingPassword} type="submit">
              {isChangingPassword ? 'Modification…' : 'Modifier le mot de passe'}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-card p-5 text-card-foreground shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Déconnecter toutes les sessions</h2>
          <p className="text-sm text-muted-foreground">
            Cette action révoque toutes les sessions actives, y compris celle de cet appareil.
          </p>
        </div>

        {errors.root?.sessions && (
          <p className="mt-3 text-sm text-destructive" role="alert">{errors.root.sessions.message}</p>
        )}

        {!confirmLogoutAll ? (
          <div className="mt-4">
            <Button
              onClick={() => setConfirmLogoutAll(true)}
              type="button"
              variant="destructive"
            >
              Déconnecter tous les appareils
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">Confirmez la révocation de toutes vos sessions.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isLoggingOutAll}
                onClick={handleLogoutAll}
                type="button"
                variant="destructive"
              >
                {isLoggingOutAll ? 'Déconnexion…' : 'Confirmer'}
              </Button>
              <Button
                disabled={isLoggingOutAll}
                onClick={() => setConfirmLogoutAll(false)}
                type="button"
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export { SecurityPage };
