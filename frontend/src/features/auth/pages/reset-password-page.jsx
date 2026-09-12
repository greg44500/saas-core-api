import { zodResolver } from '@hookform/resolvers/zod';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { PasswordPolicyFeedback } from '@/components/forms/password-policy-feedback';
import { Button } from '@/components/ui/button';
import { getPasswordResetTokenFromHash } from '@/features/auth/lib/password-reset-token';
import {
  useGetPasswordPolicyQuery,
  useResetPasswordMutation,
} from '@/features/auth/api/auth-api';
import { resetPasswordFormSchema } from '@/features/auth/validation/auth-schemas';

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token] = useState(
    () => getPasswordResetTokenFromHash(location.hash) ?? '',
  );
  useLayoutEffect(() => {
    if (!location.hash) return;

    // Le secret est déjà conservé dans l'état local du composant.
    // On le retire immédiatement de l'URL et donc de l'historique visible.
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: '',
      },
      {
        replace: true,
        state: location.state,
      },
    );
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);
  const { data: passwordPolicy } = useGetPasswordPolicyQuery();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async ({ newPassword: submittedPassword }) => {
    if (!token) return;

    try {
      await resetPassword({ token, newPassword: submittedPassword }).unwrap();
      navigate('/login', {
        replace: true,
        state: { resetPasswordSuccess: true },
      });
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Le lien est invalide, expiré ou déjà utilisé.',
      });
    }
  };

  if (!token) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Lien de réinitialisation invalide</h1>
          <p className="text-sm text-muted-foreground">
            Aucun token de réinitialisation n’est présent dans ce lien.
          </p>
        </div>
        <Link className="text-sm font-medium text-primary hover:underline" to="/forgot-password">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Réinitialiser le mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe. Toutes les sessions existantes seront révoquées.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormField id="resetNewPassword" label="Nouveau mot de passe" error={errors.newPassword?.message}>
          <div className="space-y-2">
            <PasswordField
              id="resetNewPassword"
              autoComplete="new-password"
              invalid={Boolean(errors.newPassword)}
              describedBy={errors.newPassword ? 'resetNewPassword-message' : undefined}
              {...register('newPassword')}
            />
            <PasswordPolicyFeedback password={newPassword} policy={passwordPolicy} />
          </div>
        </FormField>

        <FormField
          id="resetConfirmPassword"
          label="Confirmer le nouveau mot de passe"
          error={errors.confirmPassword?.message}
        >
          <PasswordField
            id="resetConfirmPassword"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
            describedBy={errors.confirmPassword ? 'resetConfirmPassword-message' : undefined}
            {...register('confirmPassword')}
          />
        </FormField>

        {errors.root?.server && (
          <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>
        )}

        <Button className="w-full" disabled={isLoading} type="submit">
          {isLoading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
        </Button>
      </form>
    </div>
  );
}

export { ResetPasswordPage };
