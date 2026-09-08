import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import {
  formatCommercialInvitationBillingInterval,
  formatCommercialInvitationDate,
  formatCommercialInvitationDeliveryStatus,
  formatCommercialInvitationPrice,
  formatCommercialInvitationStatus,
} from '@/features/commercial-invitation/lib/commercial-invitation-formatters';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

/**
 * Présente le snapshot métier sans exposer le token ni demander une nouvelle
 * lecture serveur. La liste Platform fournit déjà les informations nécessaires
 * et le drawer partagé conserve la mécanique d'accessibilité/focus commune.
 */
function CommercialInvitationDetailsDrawer({ invitation, onClose }) {
  const offer = invitation?.offer;

  return (
    <EntityDetailsDrawer
      description="Conditions figées au moment de l’envoi et état courant de l’invitation."
      onClose={onClose}
      open={Boolean(invitation)}
      title="Détails de l’invitation commerciale"
    >
      {invitation && (
        <div className="space-y-6">
          <dl>
            <DetailRow label="Bénéficiaire" value={invitation.email} />
            <DetailRow label="Premier workspace" value={invitation.workspaceName} />
            <DetailRow label="Plan proposé" value={offer?.planName ?? invitation.plan?.name} />
            <DetailRow label="Statut" value={formatCommercialInvitationStatus(invitation.status)} />
            <DetailRow
              label="Livraison email"
              value={formatCommercialInvitationDeliveryStatus(invitation.deliveryStatus)}
            />
            <DetailRow label="Créée le" value={formatCommercialInvitationDate(invitation.createdAt)} />
            <DetailRow label="Expire le" value={formatCommercialInvitationDate(invitation.expiresAt)} />
            <DetailRow label="Acceptée le" value={formatCommercialInvitationDate(invitation.acceptedAt)} />
            <DetailRow label="Révoquée le" value={formatCommercialInvitationDate(invitation.revokedAt)} />
          </dl>

          <section className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">Offre figée</h3>
            <dl className="mt-2">
              <DetailRow
                label="Périodicité"
                value={formatCommercialInvitationBillingInterval(offer?.billingInterval)}
              />
              <DetailRow
                label="Prix HT"
                value={formatCommercialInvitationPrice(
                  offer?.priceExclTaxMinor,
                  offer?.currency,
                )}
              />
              <DetailRow
                label="Trial"
                value={offer?.trialEnabled
                  ? `${offer.trialDurationDays} jour(s)`
                  : 'Non'}
              />
              <DetailRow
                label="Fonctionnalités"
                value={`${offer?.features?.length ?? 0} fonctionnalité(s)`}
              />
              <DetailRow
                label="Limites"
                value={`${Object.keys(offer?.limits ?? {}).length} limite(s)`}
              />
            </dl>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">Traçabilité administrative</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {invitation.reason}
            </p>
            {invitation.revokeReason && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium">Motif de révocation</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {invitation.revokeReason}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { CommercialInvitationDetailsDrawer };
