import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
import { PasswordPolicyFeedback } from '@/components/forms/password-policy-feedback';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useGetPasswordPolicyQuery } from '@/features/auth/api/auth-api';
import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';
import {
  useAcceptNewWorkspaceInvitationMutation,
  useAcceptWorkspaceInvitationMutation,
} from '@/features/workspace-invitation/api/workspace-invitation-api';
import {
  workspaceInvitationNewAccountSchema,
  workspaceInvitationTokenSchema,
} from '@/features/workspace-invitation/validation/workspace-invitation-schemas';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function AcceptWorkspaceInvitationPage() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [acceptedMembership, setAcceptedMembership] = useState(null);
  const tokenResult = workspaceInvitationTokenSchema.safeParse(
    searchParams.get('token') ?? '',
  );
  const { data: passwordPolicy } = useGetPasswordPolicyQuery();
  const { data: workspaces = [] } = useListWorkspacesQuery(undefined, {
    skip: authStatus !== 'authenticated',
  });
  const [acceptInvitation, existingState] =
    useAcceptWorkspaceInvitationMutation();
  const [acceptNewInvitation, newState] =
    useAcceptNewWorkspaceInvitationMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(workspaceInvitationNewAccountSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      legalAccepted: false,
    },
  });

  const password = watch('password');
  const legalAccepted = watch('legalAccepted');
  const authenticatedFallbackPath = workspaces.length > 0
    ? '/workspaces'
    : '/onboarding/workspace';
  const authenticatedFallbackLabel = workspaces.length > 0
    ? 'Voir mes workspaces'
    : 'Créer mon espace';

  if (authStatus === 'checking') {
    return <PageLoader />;
  }

  if (acceptedMembership) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
        <section className="w-full max-w-lg space-y-5 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Invitation acceptée</p>
            <h1 className="text-2xl font-semibold tracking-tight">Vous avez rejoint le workspace</h1>
            <p className="text-sm text-muted-foreground">
              Votre membership est maintenant actif. L’abonnement reste celui du workspace rejoint.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={`/workspaces/${acceptedMembership.workspaceId}/dashboard`}>
              Accéder au workspace
            </Link>
          </Button>
        </section>
      </main>
    );
  }

  if (!tokenResult.success) {
    const fallbackPath = authStatus === 'authenticated'
      ? authenticatedFallbackPath
      : '/login';
    const fallbackLabel = authStatus === 'authenticated'
      ? authenticatedFallbackLabel
      : 'Se connecter';

    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
        <section className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Invitation invalide</h1>
            <p className="text-sm text-muted-foreground">
              Ce lien d’invitation n’est pas utilisable. Demandez un nouveau lien à l’administrateur du workspace.
            </p>
          </div>
          <Button asChild>
            <Link to={fallbackPath}>{fallbackLabel}</Link>
          </Button>
        </section>
      </main>
    );
  }

  const token = tokenResult.data;

  const handleExistingAcceptance = async () => {
    try {
      const membership = await acceptInvitation(token).unwrap();
      setAcceptedMembership(membership);
      setSearchParams({}, { replace: true });
    } catch (error) {
      setError('root.acceptance', {
        type: 'server',
        message: getApiMessage(
          error,
          'Cette invitation ne peut pas être acceptée avec ce compte.',
        ),
      });
    }
  };

  const handleNewAcceptance = async ({ confirmPassword: _confirmPassword, ...values }) => {
    try {
      const membership = await acceptNewInvitation({
        token,
        ...values,
      }).unwrap();

      navigate('/login', {
        replace: true,
        state: {
          workspaceInvitationAccepted: true,
          from: {
            pathname: `/workspaces/${membership.workspaceId}/dashboard`,
          },
        },
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
  };

  if (authStatus === 'authenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
        <section className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Invitation workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight">Rejoindre cet espace</h1>
            <p className="text-sm text-muted-foreground">
              Confirmez l’invitation avec votre compte actuellement connecté. Son adresse email doit correspondre à celle utilisée pour l’invitation.
            </p>
          </div>

          {errors.root?.acceptance && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.acceptance.message}
            </p>
          )}

          <Button
            className="w-full"
            type="button"
            onClick={handleExistingAcceptance}
            disabled={existingState.isLoading}
          >
            {existingState.isLoading ? 'Acceptation…' : 'Accepter l’invitation'}
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
      <section className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Invitation workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight">Finaliser votre accès</h1>
          <p className="text-sm text-muted-foreground">
            Votre adresse email provient de l’invitation. Si vous n’avez pas encore de compte, complétez votre identité et choisissez votre mot de passe.
          </p>
        </div>

        <form className="space-y-4" noValidate onSubmit={handleSubmit(handleNewAcceptance)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="workspaceInvitationFirstName" label="Prénom" error={errors.firstName?.message}>
              <Input
                id="workspaceInvitationFirstName"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName) || undefined}
                aria-describedby={errors.firstName ? 'workspaceInvitationFirstName-message' : undefined}
                {...register('firstName')}
              />
            </FormField>
            <FormField id="workspaceInvitationLastName" label="Nom" error={errors.lastName?.message}>
              <Input
                id="workspaceInvitationLastName"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName) || undefined}
                aria-describedby={errors.lastName ? 'workspaceInvitationLastName-message' : undefined}
                {...register('lastName')}
              />
            </FormField>
          </div>

          <FormField id="workspaceInvitationPassword" label="Mot de passe" error={errors.password?.message}>
            <div className="space-y-2">
              <PasswordField
                id="workspaceInvitationPassword"
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
                describedBy={errors.password ? 'workspaceInvitationPassword-message' : undefined}
                {...register('password')}
              />
              <PasswordPolicyFeedback password={password} policy={passwordPolicy} />
            </div>
          </FormField>

          <FormField id="workspaceInvitationConfirmPassword" label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
            <PasswordField
              id="workspaceInvitationConfirmPassword"
              autoComplete="new-password"
              invalid={Boolean(errors.confirmPassword)}
              describedBy={errors.confirmPassword ? 'workspaceInvitationConfirmPassword-message' : undefined}
              {...register('confirmPassword')}
            />
          </FormField>

          <div className="space-y-2">
            <label className="flex items-start gap-3 text-sm" htmlFor="workspaceInvitationLegalAccepted">
              <Checkbox
                aria-invalid={Boolean(errors.legalAccepted) || undefined}
                id="workspaceInvitationLegalAccepted"
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
              <p className="text-sm text-destructive" id="workspaceInvitationLegalAccepted-message" role="alert">
                {errors.legalAccepted.message}
              </p>
            )}
          </div>

          {errors.root?.acceptance && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.acceptance.message}
            </p>
          )}

          <Button className="w-full" disabled={newState.isLoading || !legalAccepted} type="submit">
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
      </section>
    </main>
  );
}

export { AcceptWorkspaceInvitationPage };
