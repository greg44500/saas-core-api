import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForgotPasswordMutation } from '@/features/auth/api/auth-api';
import { forgotPasswordFormSchema } from '@/features/auth/validation/auth-schemas';

function ForgotPasswordPage() {
  const location = useLocation();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [successMessage, setSuccessMessage] = useState('');
  const returnTo = location.state?.returnTo;
  const accountReturnTo = location.state?.accountReturnTo;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: location.state?.email ?? '' },
  });

  const onSubmit = async (values) => {
    setSuccessMessage('');

    try {
      const response = await forgotPassword(values).unwrap();
      setSuccessMessage(
        response?.message
          ?? 'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
      );
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Impossible de traiter la demande pour le moment.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">
          Indiquez votre adresse email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormField id="recoveryEmail" label="Email" error={errors.email?.message}>
          <Input
            id="recoveryEmail"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? 'recoveryEmail-message' : undefined}
            {...register('email')}
          />
        </FormField>

        {errors.root?.server && (
          <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>
        )}
        {successMessage && (
          <p className="rounded-md border border-success/30 bg-success/10 p-3 text-sm" role="status">
            {successMessage}
          </p>
        )}

        <Button className="w-full" disabled={isLoading} type="submit">
          {isLoading ? 'Envoi…' : 'Envoyer le lien'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          className="font-medium text-primary hover:underline"
          state={returnTo && accountReturnTo ? { accountReturnTo } : undefined}
          to={returnTo ?? '/login'}
        >
          {returnTo ? 'Retour aux paramètres de sécurité' : 'Retour à la connexion'}
        </Link>
      </p>
    </div>
  );
}

export { ForgotPasswordPage };
