/**
 * États possibles du cycle de vie d'un abonnement.
 *
 * Une résiliation programmée en fin de période reste représentée séparément
 * par `cancelAtPeriodEnd`. Elle ne transforme pas immédiatement une
 * souscription active en souscription annulée.
 */
const SUBSCRIPTION_STATUS = Object.freeze({
    TRIALING: 'trialing',
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
    EXPIRED: 'expired',
});

/**
 * Périodicité commerciale retenue par une souscription.
 */
const BILLING_INTERVAL = Object.freeze({
    NONE: 'none',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
});

/**
 * Nature temporelle d'une Subscription.
 *
 * `fixed` exige une échéance contractuelle. `open_ended` représente un accès
 * sans échéance automatique, notamment la baseline ou une offre commerciale
 * gratuite durable explicitement accordée par la Plateforme.
 */
const SUBSCRIPTION_TERM_TYPE = Object.freeze({
    FIXED: 'fixed',
    OPEN_ENDED: 'open_ended',
});

/**
 * Fournisseur responsable de la gestion de la souscription.
 */
const BILLING_PROVIDER = Object.freeze({
    MANUAL: 'manual',
    STRIPE: 'stripe',
});

/**
 * Types de réductions applicables à une souscription.
 */
const DISCOUNT_TYPE = Object.freeze({
    NONE: 'none',
    PERCENTAGE: 'percentage',
    FIXED_AMOUNT: 'fixed_amount',
});

/**
 * Modes d'annulation administrativement disponibles.
 */
const SUBSCRIPTION_CANCELLATION_MODE = Object.freeze({
    IMMEDIATE: 'immediate',
    PERIOD_END: 'period_end',
});

/**
 * Types de changement de plan pouvant être programmés sur une Subscription.
 */
const SUBSCRIPTION_PLAN_CHANGE_TYPE = Object.freeze({
    DOWNGRADE: 'downgrade',
});

/**
 * Rôle fonctionnel d'une souscription dans le workspace.
 */
const SUBSCRIPTION_KIND = Object.freeze({
    BASELINE: 'baseline',
    COMMERCIAL: 'commercial',
});

export {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    DISCOUNT_TYPE,
    SUBSCRIPTION_CANCELLATION_MODE,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_TERM_TYPE,
};
