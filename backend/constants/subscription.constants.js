/**
 * États possibles du cycle de vie d'un abonnement.
 *
 * Une résiliation programmée en fin de période reste représentée séparément
 * par `cancelAtPeriodEnd`. Elle ne transforme pas immédiatement une
 * souscription active en souscription annulée.
 */
const SUBSCRIPTION_STATUS = Object.freeze({
    /**
     * Souscription actuellement dans une période d'essai.
     */
    TRIALING: 'trialing',

    /**
     * Souscription utilisable normalement.
     *
     * La souscription gratuite créée avec un workspace utilisera ce statut.
     */
    ACTIVE: 'active',

    /**
     * Paiement attendu mais non reçu.
     *
     * Ce statut sera principalement utilisé après l'intégration d'un
     * fournisseur de paiement.
     */
    PAST_DUE: 'past_due',

    /**
     * Souscription dont la résiliation est devenue effective.
     */
    CANCELED: 'canceled',

    /**
     * Souscription arrivée à expiration sans renouvellement.
     */
    EXPIRED: 'expired',
});


/**
 * Périodicité commerciale retenue par une souscription.
 *
 * `none` convient au plan gratuit, qui ne possède pas d'échéance de
 * facturation. Les périodicités payantes sont anticipées sans définir
 * aujourd'hui leurs tarifs.
 */
const BILLING_INTERVAL = Object.freeze({
    NONE: 'none',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
});


/**
 * Fournisseur responsable de la gestion de la souscription.
 *
 * La V1 utilise exclusivement `manual`. Stripe reste anticipé, mais aucune
 * intégration Stripe n'est active à ce stade.
 */
const BILLING_PROVIDER = Object.freeze({
    /**
     * Souscription gérée directement par la plateforme.
     *
     * Ce mode couvre notamment le plan gratuit et les attributions
     * administratives.
     */
    MANUAL: 'manual',

    /**
     * Souscription qui pourra être gérée ultérieurement par Stripe.
     */
    STRIPE: 'stripe',
});


/**
 * Types de réductions applicables à une souscription.
 *
 * Leur déclaration prépare la structure future. Les règles commerciales
 * précises seront implémentées ultérieurement dans SubscriptionService.
 */
const DISCOUNT_TYPE = Object.freeze({
    /**
     * Aucune réduction appliquée.
     */
    NONE: 'none',

    /**
     * Réduction exprimée en pourcentage.
     */
    PERCENTAGE: 'percentage',

    /**
     * Réduction fixe exprimée dans l'unité monétaire mineure.
     */
    FIXED_AMOUNT: 'fixed_amount',
});


export {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    DISCOUNT_TYPE,
    SUBSCRIPTION_STATUS,
};