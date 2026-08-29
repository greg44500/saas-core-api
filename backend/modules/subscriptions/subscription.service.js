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
 * Statuts permettant actuellement de consommer les capacités d'un plan.
 *
 * `past_due` reste volontairement exclu tant que la politique de délai de
 * grâce en cas d'impayé n'a pas été définie.
 */
const USABLE_SUBSCRIPTION_STATUSES = Object.freeze([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.ACTIVE,
]);

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
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId} params.workspaceId
 * @param {import('mongoose').Types.ObjectId} params.actorId
 * @param {import('mongoose').ClientSession} params.session
 * @returns {Promise<import('mongoose').Document>}
 */

const createFreeSubscriptionForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    /*
     * Une session est obligatoire pour garantir l'atomicité avec la création
     * du workspace, de ses rôles système et de son membre owner.
     */
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create a free subscription',
        );
    }

    /*
     * Le service recherche le plan par sa clé fonctionnelle stable plutôt que
     * par un ObjectId configuré manuellement.
     *
     * Un plan inactif ou archivé ne doit pas être attribué à un nouveau
     * workspace.
     */
    const freePlan = await Plan.findOne({
        key: PLAN_KEY.FREE,
        status: PLAN_STATUS.ACTIVE,
    }).session(session);

    /*
     * L'absence du plan free révèle une configuration incomplète de la
     * plateforme, généralement parce que seedPlans n'a pas été exécuté.
     */
    if (!freePlan) {
        throw new AppError(
            'Le plan gratuit actif est introuvable. Exécutez le seed des plans.',
            500,
        );
    }

    const currentPeriodStart = new Date();

    /*
     * Model.create reçoit un tableau lorsqu'une session est utilisée.
     * Cette forme garantit que la création participe réellement à la
     * transaction MongoDB reçue.
     */
    const [subscription] = await Subscription.create(
        [
            {
                workspace: workspaceId,
                plan: freePlan._id,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,

                currentPeriodStart,

                /*
                 * La baseline Free ne possède aucune échéance ni période
                 * d'essai. Les trials vivent sur une Subscription commerciale.
                 */
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,

                billingInterval: BILLING_INTERVAL.NONE,

                /*
                 * La devise et le tarif HT sont copiés afin de conserver un
                 * instantané des conditions attribuées au workspace.
                 */
                currency: freePlan.currency,
                priceExclTaxMinor:
                    freePlan.priceMonthlyExclTaxMinor,

                provider: BILLING_PROVIDER.MANUAL,

                createdBy: actorId,
                updatedBy: actorId,
            },
        ],
        {
            session,
        },
    );

    return subscription;
};

/**
 * Récupère la souscription utilisable et le plan effectif d'un workspace.
 *
 * Cette fonction constitue le point d'entrée commun des futurs contrôles de
 * fonctionnalités et de quotas. Elle évite que chaque module consommateur
 * reconstruise différemment la relation workspace → subscription → plan.
 *
 * Une session MongoDB facultative peut être transmise afin que la lecture
 * participe ultérieurement à une transaction plus large.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId} params.workspaceId
 * @param {import('mongoose').ClientSession} [params.session]
 * @returns {Promise<{
 *     subscription: import('mongoose').Document,
 *     plan: import('mongoose').Document
 * }>}
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

    /*
     * Seuls les statuts explicitement autorisés sont recherchés.
     * Un statut inconnu ou commercialement bloqué ne peut donc pas ouvrir
     * accidentellement l'accès aux capacités du plan.
     */
    const buildSubscriptionQuery = (kind) => {
        let query = Subscription.findOne({
            workspace: workspaceId,
            kind,
            status: mongoose.trusted({
                $in: USABLE_SUBSCRIPTION_STATUSES,
            }),
        }).populate({
            path: 'plan',
        });

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    const commercialSubscription = await buildSubscriptionQuery(
        SUBSCRIPTION_KIND.COMMERCIAL,
    );

    const subscription = commercialSubscription
        ?? await buildSubscriptionQuery(
            SUBSCRIPTION_KIND.BASELINE,
        );

    if (!subscription) {
        throw new AppError(
            'Aucune souscription utilisable n’est associée à ce workspace.',
            403,
        );
    }

    /*
     * Une référence de plan non résolue révèle une incohérence interne :
     * la souscription existe, mais son offre commerciale est introuvable.
     */
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
