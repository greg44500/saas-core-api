import { zodResolver } from '@hookform/resolvers/zod';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { PasswordPolicyFeedback } from '@/components/forms/password-policy-feedback';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useGetPasswordPolicyQuery } from '@/features/auth/api/auth-api';
import {
  useAcceptExistingPlatformInvitationMutation,
  useAcceptNewPlatformInvitationMutation,
} from '@/features/platform-invitation/api/platform-invitation-acceptance-api';
import {
  clearPlatformInvitationTokenInMemory,
  getPlatformInvitationTokenFromHash,
} from '@/features/platform-invitation/lib/platform-invitation-token';
import {
  platformInvitationNewAccountSchema,
  platformInvitationTokenSchema,
} from '@/features/platform-invitation/validation/platform-invitation-schemas';
import {
  useLazyGetCurrentPlatformContextQuery,
} from '@/features/platform/api/platform-current-context-api';
import {
  getFirstPlatformDestination,
} from '@/features/platform/lib/platform-navigation';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function AcceptPlatformInvitationPage() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() =>
    getPlatformInvitationTokenFromHash(location.hash));
  const tokenResult = platformInvitationTokenSchema.safeParse(
    token ?? '',
  );
  const { data: passwordPolicy } = useGetPasswordPolicyQuery();

  const [acceptExisting, existingState] =
    useAcceptExistingPlatformInvitationMutation();
  const [acceptNew, newState] = useAcceptNewPlatformInvitationMutation();
  const [getPlatformContext] = useLazyGetCurrentPlatformContextQuery();

  useLayoutEffect(() => {
    if (!location.hash) return;

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(platformInvitationNewAccountSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
      legalAccepted: false,
    },
  });

  const password = watch('password');
  const legalAccepted = watch('legalAccepted');

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (!tokenResult.success) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">
            Invitation invalide
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ce lien n’est pas utilisable
          </h1>
          <p className="text-sm text-muted-foreground">
            Le lien est incomplet ou incorrect. Demandez un nouveau lien à l’administrateur de la Plateforme.
          </p>
        </div>

        <Button asChild className="w-full" variant="outline">
          <Link to={authStatus === 'authenticated' ? '/account/profile' : '/login'}>
            Continuer
          </Link>
        </Button>
      </div>
    );
  }

  async function handleExistingAcceptance() {
    try {
      await acceptExisting(tokenResult.data).unwrap();
      clearPlatformInvitationTokenInMemory();
      const platformAccess = await getPlatformContext().unwrap();
      navigate(
        getFirstPlatformDestination(platformAccess) ?? '/account/profile',
        { replace: true },
      );
    } catch (error) {
      setError('root.acceptance', {
        type: 'server',
        message: getApiMessage(
          error,
          'Cette invitation ne peut pas être acceptée avec ce compte.',
        ),
      });
    }
  }

  async function handleNewAcceptance(values) {
    try {
      await acceptNew({
        token: tokenResult.data,
        password: values.password,
        legalAccepted: values.legalAccepted,
      }).unwrap();

      clearPlatformInvitationTokenInMemory();

      navigate('/login', {
        replace: true,
        state: { platformInvitationAccepted: true },
      });
    } catch (error) {
      setError('root.acceptance', {
        type: 'server',
        message: getApiMessage(
          error,
          'Cette invitation est invalide, expirée ou n’est plus disponible.',
        ),
      });
    }
  }

  if (authStatus === 'authenticated') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            Invitation Équipe de la Plateforme
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Rejoindre l’équipe
          </h1>
          <p className="text-sm text-muted-foreground">
            Confirmez l’invitation avec votre compte actuellement connecté. Son adresse email doit correspondre exactement à celle utilisée pour l’invitation.
          </p>
        </div>

        {errors.root?.acceptance && (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.acceptance.message}
          </p>
        )}

        <Button
          className="w-full"
          disabled={existingState.isLoading}
          onClick={handleExistingAcceptance}
          type="button"
        >
          {existingState.isLoading ? 'Acceptation…' : 'Accepter l’invitation'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">
          Invitation Équipe de la Plateforme
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Finaliser votre accès
        </h1>
        <p className="text-sm text-muted-foreground">
          Votre identité et votre adresse email proviennent de l’invitation. Si vous n’avez pas encore de compte, choisissez uniquement votre mot de passe.
        </p>
      </div>

      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(handleNewAcceptance)}
      >
        <FormField
          error={errors.password?.message}
          id="platform-invitation-password"
          label="Mot de passe"
        >
          <div className="space-y-2">
            <PasswordField
              autoComplete="new-password"
              describedBy={errors.password ? 'platform-invitation-password-message' : undefined}
              id="platform-invitation-password"
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <PasswordPolicyFeedback password={password} policy={passwordPolicy} />
          </div>
        </FormField>

        <FormField
          error={errors.confirmPassword?.message}
          id="platform-invitation-confirm-password"
          label="Confirmer le mot de passe"
        >
          <PasswordField
            autoComplete="new-password"
            describedBy={errors.confirmPassword
              ? 'platform-invitation-confirm-password-message'
              : undefined}
            id="platform-invitation-confirm-password"
            invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </FormField>

        <div className="space-y-2">
          <label className="flex items-start gap-3 text-sm" htmlFor="platformInvitationLegalAccepted">
            <Checkbox
              aria-invalid={Boolean(errors.legalAccepted) || undefined}
              id="platformInvitationLegalAccepted"
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
          {errors.legalAccepted && (
            <p className="text-sm text-destructive" id="platformInvitationLegalAccepted-message" role="alert">
              {errors.legalAccepted.message}
            </p>
          )}
        </div>

        {errors.root?.acceptance && (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.acceptance.message}
          </p>
        )}

        <Button
          className="w-full"
          disabled={newState.isLoading || !legalAccepted}
          type="submit"
        >
          {newState.isLoading ? 'Création…' : 'Créer mon accès'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{' '}
        <Link
          className="font-medium text-primary hover:underline"
          state={{
            from: {
              pathname: location.pathname,
              search: location.search,
            },
          }}
          to="/login"
        >
          Se connecter pour accepter
        </Link>
      </p>
    </div>
  );
}

export {
  AcceptPlatformInvitationPage,
  getFirstPlatformDestination,
};
