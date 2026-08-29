import mongoose from 'mongoose';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
} from '../../constants/subscription.constants.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
} from '../../constants/plan.constants.js';

import { Plan } from '../plan/plan.model.js';
import { Subscription } from './subscription.model.js';

import { AppError } from '../../utils/appError.js';

/**
 * Crée la souscription gratuite initiale d'un nouveau workspace.
 *
 * Cette opération participe à la transaction de création du workspace.
 * La session MongoDB est donc obligatoire : le workspace ne doit pas être
 * conservé si sa souscription initiale ne peut pas être créée.
 *
 * Le plan Free constitue la baseline durable du workspace. Un futur trial ou
 * abonnement payant est représenté par une souscription `commercial` séparée :
 * la baseline Free n'est donc ni remplacée ni supprimée lorsqu'un trial est
 * accordé.
 */
const createFreeSubscriptionForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create a free subscription',
        );
    }

    const freePlan = await Plan.findOne({
        key: PLAN_KEY.FREE,
        status: PLAN_STATUS.ACTIVE,
    }).session(session);

    if (!freePlan) {
        throw new AppError(
            'Le plan gratuit actif est introuvable. Exécutez le seed des plans.',
            500,
        );
    }

    const currentPeriodStart = new Date();

    const [subscription] = await Subscription.create(
        [
            {
                workspace: workspaceId,
                plan: freePlan._id,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodStart,
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: BILLING_INTERVAL.NONE,
                currency: freePlan.currency,
                priceExclTaxMinor:
                    freePlan.priceMonthlyExclTaxMinor,
                provider: BILLING_PROVIDER.MANUAL,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ],
        { session },
    );

    return subscription;
};

/**
 * Récupère la souscription utilisable et le plan effectif d'un workspace.
 *
 * Les bornes temporelles sont des autorités métier. Un job de maintenance ne
 * sert qu'à réconcilier l'état persistant : un retard d'exécution ne doit jamais
 * prolonger un trial ni une période commerciale déjà terminée.
 */
const getWorkspacePlanEntitlement = async ({
    workspaceId,
    session,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve a workspace plan entitlement',
        );
    }

    const now = new Date();

    const buildSubscriptionQuery = (filter) => {
        let query = Subscription.findOne({
            workspace: workspaceId,
            ...filter,
        }).populate({
            path: 'plan',
        });

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    /*
     * Une souscription commerciale payante n'ouvre des droits que pendant sa
     * période contractuelle courante. Cela couvre notamment une résiliation
     * programmée arrivée à échéance avant le passage du job de réconciliation.
     * Une valeur null ou malformée ne peut donc pas ouvrir des droits payants.
     */
    let commercialSubscription = await buildSubscriptionQuery({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodEnd: mongoose.trusted({
            $type: 'date',
            $gt: now,
        }),
    });

    if (!commercialSubscription) {
        commercialSubscription = await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            trialEndsAt: mongoose.trusted({
                $type: 'date',
                $gt: now,
            }),
        });
    }

    const subscription = commercialSubscription
        ?? await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.BASELINE,
            status: SUBSCRIPTION_STATUS.ACTIVE,
        });

    if (!subscription) {
        throw new AppError(
            'Aucune souscription utilisable n’est associée à ce workspace.',
            403,
        );
    }

    if (!subscription.plan) {
        throw new AppError(
            'Le plan associé à la souscription est introuvable.',
            500,
        );
    }

    return {
        subscription,
        plan: subscription.plan,
    };
};

export {
    createFreeSubscriptionForWorkspace,
    getWorkspacePlanEntitlement,
};
