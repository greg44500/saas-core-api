import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { useLogoutMutation } from '@/features/auth/api/auth-api';
import {
  useAcceptCommercialInvitationMutation,
  useDeclineCommercialInvitationMutation,
  usePreviewCommercialInvitationMutation,
  useVerifyCommercialInvitationRecipientMutation,
} from '@/features/commercial-invitation/api/commercial-invitations-api';
import { CommercialInvitationProgress } from '@/features/commercial-invitation/components/commercial-invitation-progress';
import {
  buildCommercialInvitationAuthState,
  clearCommercialInvitationTokenFragment,
  clearCommercialInvitationTokenInMemory,
  getCommercialInvitationTokenFromLocation,
} from '@/features/commercial-invitation/lib/commercial-invitation';
import {
  formatCommercialInvitationBillingInterval,
  formatCommercialInvitationDate,
  formatCommercialInvitationPrice,
} from '@/features/commercial-invitation/lib/commercial-invitation-formatters';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function CommercialInvitationOfferSummary({ invitation }) {
  const offer = invitation.offer;

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Offre proposée
        </p>
        <h2 className="text-lg font-semibold">{offer.planName}</h2>
        <p className="text-sm text-muted-foreground">
          Premier espace de travail : {invitation.workspaceName}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Périodicité</dt>
          <dd className="font-medium">
            {formatCommercialInvitationBillingInterval(offer.billingInterval)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tarif de référence HT</dt>
          <dd className="font-medium">
            {formatCommercialInvitationPrice(
              offer.priceExclTaxMinor,
              offer.currency,
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Accès</dt>
          <dd className="font-medium">
            {offer.trialEnabled
              ? `Essai de ${offer.trialDurationDays} jour(s)`
              : 'Accès privé gratuit sans échéance automatique'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lien valable jusqu’au</dt>
          <dd className="font-medium">
            {formatCommercialInvitationDate(invitation.expiresAt)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        {offer.features?.length ?? 0} fonctionnalité(s) et {Object.keys(offer.limits ?? {}).length} limite(s) sont définies par cette offre privée.
      </p>
    </section>
  );
}

/**
 * Le secret est capturé une seule fois depuis le fragment dans un vault runtime
 * puis retiré de l'URL. Il ne passe ni par Redux, ni par les stockages Web, ni
 * par `history.state`. Un rechargement complet oblige donc à rouvrir le lien
 * d'invitation, ce qui limite volontairement la persistance du secret.
 */
function AcceptCommercialInvitationPage() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const navigate = useNavigate();
  const [token] = useState(() => getCommercialInvitationTokenFromLocation());
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [previewInvitation, previewState] =
    usePreviewCommercialInvitationMutation();
  const [verifyRecipient, recipientState] =
    useVerifyCommercialInvitationRecipientMutation();
  const [acceptInvitation, acceptState] =
    useAcceptCommercialInvitationMutation();
  const [declineInvitation, declineState] =
    useDeclineCommercialInvitationMutation();
  const [logout, logoutState] = useLogoutMutation();

  useEffect(() => {
    clearCommercialInvitationTokenFragment();
  }, []);

  useEffect(() => {
    if (token) {
      previewInvitation(token);
    }
  }, [previewInvitation, token]);

  useEffect(() => {
    if (
      token
      && authStatus === 'authenticated'
      && previewState.data
    ) {
      verifyRecipient(token);
    }
  }, [authStatus, previewState.data, token, verifyRecipient]);

  if (!token) {
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
            Le lien est incomplet, incorrect ou la page a été rechargée après sécurisation du lien. Rouvrez l’invitation reçue par email.
          </p>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link to="/">Revenir à l’accueil</Link>
        </Button>
      </div>
    );
  }

  if (
    authStatus === 'checking'
    || (!previewState.data && !previewState.error)
    || (
      authStatus === 'authenticated'
      && previewState.data
      && !recipientState.data
      && !recipientState.error
    )
  ) {
    return <PageLoader />;
  }

  if (previewState.error) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">
            Invitation indisponible
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cette proposition ne peut plus être ouverte
          </h1>
          <p className="text-sm text-muted-foreground" role="alert">
            {getApiMessage(
              previewState.error,
              'Cette invitation est expirée, révoquée, refusée ou son offre a été modifiée depuis son envoi.',
            )}
          </p>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link to="/">Revenir à l’accueil</Link>
        </Button>
      </div>
    );
  }

  const invitation = previewState.data;
  const authState = buildCommercialInvitationAuthState();
  const recipientMismatch = authStatus === 'authenticated'
    && recipientState.error?.status === 403;
  const recipientVerified = authStatus === 'authenticated'
    && recipientState.data?.matchesRecipient === true;
  const currentStep = recipientVerified
    ? 3
    : authStatus === 'authenticated'
      ? 2
      : 1;

  async function handleAcceptance() {
    if (!recipientVerified) return;

    try {
      const result = await acceptInvitation(token).unwrap();
      clearCommercialInvitationTokenInMemory();
      navigate(`/workspaces/${result.workspace.id}/dashboard`, {
        replace: true,
        state: { commercialInvitationAccepted: true },
      });
    } catch {
      // L'erreur RTK Query reste portée par acceptState afin d'afficher le
      // message backend sans dupliquer un second état local.
    }
  }

  async function handleAccountSwitch() {
    try {
      await logout().unwrap();
    } finally {
      /*
       * Le vault runtime n'est volontairement pas effacé ici : changer de
       * compte corrige une session incompatible avec le destinataire. Le secret
       * reste absent de l'URL et de history.state, puis sera relu au retour.
       */
      navigate('/login', {
        replace: true,
        state: authState,
      });
    }
  }

  async function handleDecline() {
    if (!recipientVerified) return;

    try {
      await declineInvitation(token).unwrap();
      clearCommercialInvitationTokenInMemory();
      await logout().unwrap();
      navigate('/', { replace: true });
    } catch {
      // Si le refus lui-même échoue, le dialogue reste ouvert et expose le
      // message serveur. Aucune invalidation locale ne doit simuler le succès.
    }
  }

  return (
    <div className="space-y-6">
      <CommercialInvitationProgress currentStep={currentStep} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">
          Invitation commerciale
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Votre accès privé est prêt à être activé
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultez les conditions proposées. Le workspace sera créé seulement après votre acceptation.
        </p>
      </div>

      <CommercialInvitationOfferSummary invitation={invitation} />

      {invitation.offer.trialEnabled && (
        <p className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Aucun moyen de paiement n’est demandé dans ce parcours d’invitation. La durée de l’essai commence lors de l’acceptation effective.
        </p>
      )}

      {recipientMismatch && (
        <div className="space-y-3">
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            Cette invitation est destinée à un autre compte. Connectez-vous avec l’adresse ayant reçu l’invitation.
          </p>
          <Button
            className="w-full"
            disabled={logoutState.isLoading}
            onClick={handleAccountSwitch}
            type="button"
            variant="outline"
          >
            {logoutState.isLoading
              ? 'Changement de compte…'
              : 'Utiliser un autre compte'}
          </Button>
        </div>
      )}

      {authStatus === 'authenticated'
        && recipientState.error
        && !recipientMismatch && (
          <p className="text-sm text-destructive" role="alert">
            {getApiMessage(
              recipientState.error,
              'Impossible de vérifier le bénéficiaire de cette invitation.',
            )}
          </p>
        )}

      {acceptState.error && (
        <p className="text-sm text-destructive" role="alert">
          {getApiMessage(
            acceptState.error,
            'Cette invitation ne peut pas être acceptée avec ce compte.',
          )}
        </p>
      )}

      {recipientVerified && (
        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={acceptState.isLoading || declineState.isLoading}
            onClick={handleAcceptance}
            type="button"
          >
            {acceptState.isLoading
              ? 'Activation de votre accès…'
              : 'Accepter et créer mon espace'}
          </Button>
          <Button
            className="w-full"
            disabled={acceptState.isLoading || declineState.isLoading}
            onClick={() => setDeclineDialogOpen(true)}
            type="button"
            variant="outline"
          >
            Refuser l’offre
          </Button>
        </div>
      )}

      {authStatus !== 'authenticated' && (
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link state={authState} to="/register">
              Créer mon compte
            </Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link state={authState} to="/login">
              J’ai déjà un compte
            </Link>
          </Button>
        </div>
      )}

      <ConfirmationDialog
        confirmLabel="Refuser définitivement"
        description="Le workspace ne sera pas créé et ce lien d’invitation deviendra immédiatement inutilisable. Votre compte reste distinct de cette proposition commerciale."
        errorMessage={declineState.error
          ? getApiMessage(
            declineState.error,
            'Impossible de refuser cette invitation pour le moment.',
          )
          : null}
        onCancel={() => setDeclineDialogOpen(false)}
        onConfirm={handleDecline}
        open={declineDialogOpen}
        pending={declineState.isLoading || logoutState.isLoading}
        pendingLabel="Refus en cours…"
        title="Refuser cette offre ?"
      />
    </div>
  );
}

export {
  AcceptCommercialInvitationPage,
  CommercialInvitationOfferSummary,
};
