import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { PasswordPolicyFeedback } from '@/components/forms/password-policy-feedback';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useGetPasswordPolicyQuery,
  useRegisterMutation,
} from '@/features/auth/api/auth-api';
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
  const { data: passwordPolicy } = useGetPasswordPolicyQuery();
  const [registerAccount, registerAccountState] = useRegisterMutation();
  const [registerCommercialRecipient, commercialRegisterState] =
    useRegisterCommercialInvitationRecipientMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
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
      legalAccepted: false,
    },
  });

  const password = watch('password');
  const legalAccepted = watch('legalAccepted');
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
            <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
          </FormField>
          <FormField id="lastName" label="Nom" error={errors.lastName?.message}>
            <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
          </FormField>
        </div>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>

        <FormField id="password" label="Mot de passe" error={errors.password?.message}>
          <div className="space-y-2">
            <PasswordField
              aria-describedby={errors.password ? 'password-message' : undefined}
              aria-invalid={Boolean(errors.password) || undefined}
              id="password"
              autoComplete="new-password"
              {...register('password')}
            />
            <PasswordPolicyFeedback password={password} policy={passwordPolicy} />
          </div>
        </FormField>

        <FormField id="confirmPassword" label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
          <PasswordField id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>

        <Field>
          <label className="flex items-start gap-3 text-sm" htmlFor="legalAccepted">
            <Checkbox
              aria-describedby={errors.legalAccepted ? 'legalAccepted-message' : undefined}
              aria-invalid={Boolean(errors.legalAccepted) || undefined}
              id="legalAccepted"
              {...register('legalAccepted')}
            />
            <span className="leading-5">
              J’accepte les{' '}
              <Link className="font-medium text-primary hover:underline" target="_blank" to="/legal/terms">
                Conditions générales d’utilisation
              </Link>{' '}
              et reconnais avoir pris connaissance de la{' '}
              <Link className="font-medium text-primary hover:underline" target="_blank" to="/legal/privacy">
                Politique de confidentialité
              </Link>.
            </span>
          </label>
          <FieldError id="legalAccepted-message">
            {errors.legalAccepted?.message}
          </FieldError>
        </Field>

        {errors.root?.server && <p className="text-sm text-destructive" role="alert">{errors.root.server.message}</p>}

        <Button className="w-full" type="submit" disabled={isLoading || !legalAccepted}>
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
