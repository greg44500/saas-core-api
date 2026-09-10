import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRegisterMutation } from '@/features/auth/api/auth-api';
import { registerSchema } from '@/features/auth/validation/auth-schemas';
import {
  useRegisterCommercialInvitationRecipientMutation,
} from '@/features/commercial-invitation/api/commercial-invitations-api';
import { CommercialInvitationProgress } from '@/features/commercial-invitation/components/commercial-invitation-progress';
import {
  buildCommercialInvitationAuthState,
  getCommercialInvitationTokenFromLocation,
} from '@/features/commercial-invitation/lib/commercial-invitation';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function RegisterPage() {
  const navigate = useNavigate();
  const commercialInvitationToken = getCommercialInvitationTokenFromLocation();
  const commercialInvitationState = commercialInvitationToken
    ? buildCommercialInvitationAuthState()
    : undefined;
  const [registerAccount, registerAccountState] = useRegisterMutation();
  const [registerCommercialRecipient, commercialRegisterState] =
    useRegisterCommercialInvitationRecipientMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const isLoading = registerAccountState.isLoading
    || commercialRegisterState.isLoading;

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...payload }) => {
    try {
      if (commercialInvitationToken) {
        await registerCommercialRecipient({
          ...payload,
          token: commercialInvitationToken,
        }).unwrap();
      } else {
        await registerAccount(payload).unwrap();
      }

      navigate('/login', {
        replace: true,
        state: {
          registrationSuccess: true,
          ...(commercialInvitationState ?? {}),
        },
      });
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: getApiMessage(
          error,
          'Impossible de créer le compte. Vérifiez les informations puis réessayez.',
        ),
      });
    }
  };

  return (
    <div className="space-y-6">
      {commercialInvitationToken && (
        <CommercialInvitationProgress currentStep={1} />
      )}

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Créer votre compte</h1>
        <p className="text-sm text-muted-foreground">
          {commercialInvitationToken
            ? 'Créez le compte correspondant à l’adresse ayant reçu cette invitation. Votre espace sera créé seulement après acceptation de l’offre.'
            : 'Créez votre identité. Le workspace et le plan viendront ensuite.'}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="firstName" label="Prénom" error={errors.firstName?.message}>
            <Input id="firstName" autoComplete="given-name" aria-invalid={Boolean(errors.firstName) || undefined} aria-describedby={errors.firstName ? 'firstName-message' : undefined} {...register('firstName')} />
          </FormField>
          <FormField id="lastName" label="Nom" error={errors.lastName?.message}>
            <Input id="lastName" autoComplete="family-name" aria-invalid={Boolean(errors.lastName) || undefined} aria-describedby={errors.lastName ? 'lastName-message' : undefined} {...register('lastName')} />
          </FormField>
        </div>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email) || undefined} aria-describedby={errors.email ? 'email-message' : undefined} {...register('email')} />
        </FormField>

        <FormField id="password" label="Mot de passe" error={errors.password?.message} hint="15 à 128 caractères.">
          <PasswordField id="password" autoComplete="new-password" invalid={Boolean(errors.password)} describedBy="password-message" {...register('password')} />
        </FormField>

        <FormField id="confirmPassword" label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
          <PasswordField id="confirmPassword" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} describedBy={errors.confirmPassword ? 'confirmPassword-message' : undefined} {...register('confirmPassword')} />
        </FormField>

        {errors.root?.server && <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link
          className="font-medium text-primary hover:underline"
          state={commercialInvitationState}
          to="/login"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export { RegisterPage };
