import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import {
  useAcceptCommercialInvitationMutation,
  usePreviewCommercialInvitationMutation,
} from '@/features/commercial-invitation/api/commercial-invitations-api';
import {
  buildCommercialInvitationAuthState,
  clearCommercialInvitationTokenFragment,
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
 * Le secret est lu une seule fois depuis le fragment ou l'état React Router,
 * puis retiré de l'URL. Il circule uniquement dans l'état de navigation du
 * parcours et n'est jamais persisté dans Redux, localStorage ou sessionStorage.
 */
function AcceptCommercialInvitationPage() {
  const authStatus = useSelector((state) => state.auth.authStatus);
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => (
    getCommercialInvitationTokenFromLocation(location)
  ));
  const [previewInvitation, previewState] =
    usePreviewCommercialInvitationMutation();
  const [acceptInvitation, acceptState] =
    useAcceptCommercialInvitationMutation();

  useEffect(() => {
    clearCommercialInvitationTokenFragment();
  }, []);

  useEffect(() => {
    if (token) {
      previewInvitation(token);
    }
  }, [previewInvitation, token]);

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
            Le lien est incomplet ou incorrect. Demandez une nouvelle invitation à l’équipe qui vous a contacté.
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
              'Cette invitation est expirée, révoquée ou son offre a été modifiée depuis son envoi.',
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
  const authState = buildCommercialInvitationAuthState(token);

  async function handleAcceptance() {
    try {
      const result = await acceptInvitation(token).unwrap();
      navigate(`/workspaces/${result.workspace.id}/dashboard`, {
        replace: true,
        state: { commercialInvitationAccepted: true },
      });
    } catch {
      // L'erreur RTK Query reste portée par acceptState afin d'afficher le
      // message backend sans dupliquer un second état local.
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">
          Invitation commerciale
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Votre accès privé est prêt à être activé
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultez les conditions proposées puis utilisez le compte correspondant à l’adresse ayant reçu l’invitation. Le workspace sera créé seulement après votre acceptation.
        </p>
      </div>

      <CommercialInvitationOfferSummary invitation={invitation} />

      {invitation.offer.trialEnabled && (
        <p className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Aucun moyen de paiement n’est demandé dans ce parcours d’invitation. La durée de l’essai commence lors de l’acceptation effective.
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

      {authStatus === 'authenticated' ? (
        <Button
          className="w-full"
          disabled={acceptState.isLoading}
          onClick={handleAcceptance}
          type="button"
        >
          {acceptState.isLoading
            ? 'Activation de votre accès…'
            : 'Accepter et créer mon espace'}
        </Button>
      ) : (
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
    </div>
  );
}

export {
  AcceptCommercialInvitationPage,
  CommercialInvitationOfferSummary,
};
