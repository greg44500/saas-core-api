import {
    BILLING_INTERVAL,
} from '../../../constants/subscription.constants.js';

import {
    AppError,
} from '../../../utils/appError.js';


/**
 * Résout le tarif catalogue à figer dans la Subscription au moment du paiement.
 *
 * Les prix définitifs pourront évoluer dans Plan. Le snapshot stocké dans la
 * Subscription doit en revanche rester stable pour conserver les conditions
 * contractuelles acceptées au moment de l'activation payante.
 *
 * @param {import('mongoose').Document|object} plan
 * @param {string} billingInterval
 * @returns {number}
 */
const resolvePaidPlanPrice = (plan, billingInterval) => {
    if (billingInterval === BILLING_INTERVAL.MONTHLY) {
        return plan.priceMonthlyExclTaxMinor;
    }

    if (billingInterval === BILLING_INTERVAL.YEARLY) {
        return plan.priceYearlyExclTaxMinor;
    }

    throw new AppError(
        'Un abonnement payant doit utiliser une périodicité mensuelle ou annuelle',
        409,
    );
};


/**
 * Ajoute une période contractuelle calendaire à la date réelle du paiement.
 *
 * Une mensualisation ne correspond pas à +30 jours. Le calcul conserve le jour
 * civil lorsque celui-ci existe dans le mois cible et se rabat sur le dernier
 * jour du mois sinon (ex. 31 janvier -> 28/29 février).
 *
 * Les calculs utilisent UTC car les dates de paiement et MongoDB sont stockées
 * comme instants absolus. Un futur provider de paiement pourra fournir
 * directement ses bornes de période et devenir la source de vérité.
 *
 * @param {Date} paidAt
 * @param {string} billingInterval
 * @returns {Date}
 */
const calculatePaidPeriodEnd = (paidAt, billingInterval) => {
    if (
        !(paidAt instanceof Date)
        || Number.isNaN(paidAt.getTime())
    ) {
        throw new TypeError(
            'paidAt must be a valid Date to calculate the paid billing period',
        );
    }

    let targetYear = paidAt.getUTCFullYear();
    let targetMonth = paidAt.getUTCMonth();

    if (billingInterval === BILLING_INTERVAL.MONTHLY) {
        targetMonth += 1;
    } else if (billingInterval === BILLING_INTERVAL.YEARLY) {
        targetYear += 1;
    } else {
        throw new AppError(
            'Un abonnement payant doit utiliser une périodicité mensuelle ou annuelle',
            409,
        );
    }

    const normalizedMonthDate = new Date(Date.UTC(
        targetYear,
        targetMonth,
        1,
        paidAt.getUTCHours(),
        paidAt.getUTCMinutes(),
        paidAt.getUTCSeconds(),
        paidAt.getUTCMilliseconds(),
    ));

    const lastDayOfTargetMonth = new Date(Date.UTC(
        normalizedMonthDate.getUTCFullYear(),
        normalizedMonthDate.getUTCMonth() + 1,
        0,
    )).getUTCDate();

    normalizedMonthDate.setUTCDate(
        Math.min(
            paidAt.getUTCDate(),
            lastDayOfTargetMonth,
        ),
    );

    return normalizedMonthDate;
};


/**
 * DTO stable retourné après activation payante.
 */
const buildPaidSubscriptionDto = (subscription) => ({
    id: subscription._id.toString(),
    workspace:
        subscription.workspace?.toString() ?? null,
    plan:
        subscription.plan?.toString() ?? null,
    kind: subscription.kind,
    status: subscription.status,
    currentPeriodStart:
        subscription.currentPeriodStart,
    currentPeriodEnd:
        subscription.currentPeriodEnd,
    trialEndsAt:
        subscription.trialEndsAt,
    billingInterval:
        subscription.billingInterval,
    currency: subscription.currency,
    priceExclTaxMinor:
        subscription.priceExclTaxMinor,
    provider: subscription.provider,
    providerCustomerId:
        subscription.providerCustomerId ?? null,
    providerSubscriptionId:
        subscription.providerSubscriptionId ?? null,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
});


export {
    buildPaidSubscriptionDto,
    calculatePaidPeriodEnd,
    resolvePaidPlanPrice,
};
