import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    AppError,
} from '../../../utils/appError.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import {
    Plan,
} from '../../plan/plan.model.js';

import {
    Subscription,
} from '../subscription.model.js';

import {
    buildPaidSubscriptionDto,
    calculatePaidPeriodEnd,
    resolvePaidPlanPrice,
} from './activatePaidSubscriptionFromTrial.helpers.js';


/**
 * Active immédiatement un abonnement payant à partir d'un trial en cours.
 *
 * Ce service constitue la frontière métier appelée APRÈS confirmation du
 * paiement par une couche de paiement de confiance. Il ne valide jamais un
 * moyen de paiement lui-même et n'accepte donc aucun booléen simulant un
 * "paymentMethodValid".
 *
 * Invariants métier protégés :
 * - seule une Subscription commerciale encore `trialing` peut être convertie ;
 * - trialEndsAt doit être strictement postérieur à paidAt ;
 * - le plan cible doit être actif et différent de Free ;
 * - la date réelle du paiement devient currentPeriodStart ;
 * - currentPeriodEnd est calculé selon une période calendaire mensuelle/annuelle ;
 * - le prix et la devise sont snapshotés depuis le Plan actif ;
 * - trialEndsAt est conservé comme historique et ne prolonge plus les droits ;
 * - TrialEligibility n'est jamais modifié ;
 * - la baseline Free reste intacte ;
 * - la transition et l'audit sont atomiques ;
 * - une transition concurrente ne peut pas écraser un nouvel état.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {import('mongoose').Types.ObjectId|string} params.planId
 * @param {'monthly'|'yearly'} params.billingInterval
 * @param {Date} params.paidAt
 * @param {'manual'|'stripe'} params.provider
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.providerCustomerId]
 * @param {string|null} [params.providerSubscriptionId]
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const activatePaidSubscriptionFromTrial = async ({
    workspaceId,
    planId,
    billingInterval,
    paidAt,
    provider,
    actorId,
    providerCustomerId = null,
    providerSubscriptionId = null,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !workspaceId
        || !planId
        || !billingInterval
        || !provider
        || !actorId
    ) {
        throw new TypeError(
            'workspaceId, planId, billingInterval, provider and actorId are required to activate a paid subscription from trial',
        );
    }

    if (
        !(paidAt instanceof Date)
        || Number.isNaN(paidAt.getTime())
    ) {
        throw new TypeError(
            'paidAt must be a valid Date to activate a paid subscription from trial',
        );
    }

    if (
        billingInterval !== BILLING_INTERVAL.MONTHLY
        && billingInterval !== BILLING_INTERVAL.YEARLY
    ) {
        throw new AppError(
            'Un abonnement payant doit utiliser une périodicité mensuelle ou annuelle',
            409,
        );
    }

    if (!Object.values(BILLING_PROVIDER).includes(provider)) {
        throw new AppError(
            'Le fournisseur de paiement est invalide',
            409,
        );
    }

    let activatedSubscription;

    await mongoose.connection.transaction(async (session) => {
        const plan = await Plan.findOne({
            _id: planId,
            status: PLAN_STATUS.ACTIVE,
        }).session(session);

        if (!plan) {
            throw new AppError(
                'Le plan sélectionné est introuvable ou indisponible',
                404,
            );
        }

        if (plan.key === PLAN_KEY.FREE) {
            throw new AppError(
                'Le plan gratuit ne peut pas être activé comme abonnement payant',
                409,
            );
        }

        const priceExclTaxMinor = resolvePaidPlanPrice(
            plan,
            billingInterval,
        );

        if (
            !Number.isInteger(priceExclTaxMinor)
            || priceExclTaxMinor < 0
        ) {
            throw new AppError(
                'Le tarif du plan sélectionné est invalide',
                500,
            );
        }

        const existingTrial = await Subscription.findOne({
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
        }).session(session);

        if (!existingTrial) {
            throw new AppError(
                'Aucun trial commercial actif n’est disponible pour ce workspace',
                409,
            );
        }

        if (
            !existingTrial.trialEndsAt
            || existingTrial.trialEndsAt <= paidAt
        ) {
            throw new AppError(
                'Le trial commercial est déjà arrivé à expiration à la date du paiement',
                409,
            );
        }

        const currentPeriodEnd = calculatePaidPeriodEnd(
            paidAt,
            billingInterval,
        );

        const previousPlanId =
            existingTrial.plan?.toString() ?? null;

        /*
         * Le statut et l'échéance du trial font partie du filtre de transition.
         * Une expiration, annulation ou activation concurrente rend donc
         * l'opération caduque au lieu d'écraser silencieusement le nouvel état.
         */
        activatedSubscription =
            await Subscription.findOneAndUpdate(
                {
                    _id: existingTrial._id,
                    workspace: workspaceId,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.TRIALING,
                    trialEndsAt: mongoose.trusted({
                        $type: 'date',
                        $gt: paidAt,
                    }),
                },
                {
                    $set: {
                        plan: plan._id,
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        currentPeriodStart: paidAt,
                        currentPeriodEnd,
                        cancelAtPeriodEnd: false,
                        billingInterval,
                        currency: plan.currency,
                        priceExclTaxMinor,
                        provider,
                        providerCustomerId,
                        providerSubscriptionId,
                        updatedBy: actorId,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        if (!activatedSubscription) {
            throw new AppError(
                'La souscription commerciale a changé pendant son activation',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action:
                    AUDIT_ACTION.SUBSCRIPTION_ACTIVATED_FROM_TRIAL,
                entityType:
                    AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId:
                    activatedSubscription._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: 'trial_converted_to_paid',
                    previousStatus:
                        SUBSCRIPTION_STATUS.TRIALING,
                    newStatus:
                        SUBSCRIPTION_STATUS.ACTIVE,
                    previousPlanId,
                    newPlanId:
                        plan._id.toString(),
                    billingInterval,
                    paidAt,
                    currentPeriodEnd,
                    trialEndsAt:
                        existingTrial.trialEndsAt,
                    trialHistoryPreserved: true,
                    trialEligibilityPreserved: true,
                    provider,
                },
            },
            { session },
        );
    });

    return buildPaidSubscriptionDto(
        activatedSubscription,
    );
};


export {
    activatePaidSubscriptionFromTrial,
};
