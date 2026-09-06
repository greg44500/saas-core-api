import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import {
  useAcceptExistingPlatformInvitationMutation,
  useAcceptNewPlatformInvitationMutation,
} from '@/features/platform-invitation/api/platform-invitation-acceptance-api';
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
  const [searchParams] = useSearchParams();
  const tokenResult = platformInvitationTokenSchema.safeParse(
    searchParams.get('token') ?? '',
  );

  const [acceptExisting, existingState] =
    useAcceptExistingPlatformInvitationMutation();
  const [acceptNew, newState] = useAcceptNewPlatformInvitationMutation();
  const [getPlatformContext] = useLazyGetCurrentPlatformContextQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(platformInvitationNewAccountSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

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

  const token = tokenResult.data;

  async function handleExistingAcceptance() {
    try {
      await acceptExisting(token).unwrap();
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
        token,
        password: values.password,
      }).unwrap();

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
          hint="15 caractères minimum."
          id="platform-invitation-password"
          label="Mot de passe"
        >
          <PasswordField
            autoComplete="new-password"
            describedBy="platform-invitation-password-message"
            id="platform-invitation-password"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
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

        {errors.root?.acceptance && (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.acceptance.message}
          </p>
        )}

        <Button
          className="w-full"
          disabled={newState.isLoading}
          type="submit"
        >
          {newState.isLoading ? 'Création…' : 'Créer mon accès'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{' '}
        <Link
          className="font-medium text-primary hover:underline"
          state={{ from: location }}
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
