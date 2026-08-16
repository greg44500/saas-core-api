import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_STATUS,
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
 * Dans l'état actuel du développement, le plan free est attribué sans date
 * d'expiration. La future politique commerciale pourra remplacer ce
 * comportement par une période d'essai sans modifier la responsabilité
 * fondamentale de Subscription.
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

                status: SUBSCRIPTION_STATUS.ACTIVE,

                currentPeriodStart,

                /*
                 * Le plan free de développement ne possède actuellement
                 * aucune échéance ni période d'essai.
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


export { createFreeSubscriptionForWorkspace };