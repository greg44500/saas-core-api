import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { Button } from '@/components/ui/button';
import { useResetPasswordMutation } from '@/features/auth/api/auth-api';
import { resetPasswordFormSchema } from '@/features/auth/validation/auth-schemas';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    setError,
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

  const onSubmit = async ({ newPassword }) => {
    if (!token) return;

    try {
      await resetPassword({ token, newPassword }).unwrap();
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
          <PasswordField
            id="resetNewPassword"
            autoComplete="new-password"
            invalid={Boolean(errors.newPassword)}
            describedBy={errors.newPassword ? 'resetNewPassword-message' : undefined}
            {...register('newPassword')}
          />
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
