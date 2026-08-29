import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
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
    Subscription,
} from '../subscription.model.js';


/**
 * Termine volontairement le trial commercial d'un workspace et laisse la
 * baseline Free redevenir l'offre effective.
 *
 * Invariants métier protégés :
 * - seule une Subscription commerciale réellement `trialing` peut être
 *   terminée par ce service ;
 * - la baseline existante doit rester active et n'est jamais recréée ;
 * - l'abandon volontaire produit le statut `canceled`, tandis que `expired`
 *   reste réservé à l'expiration naturelle du trial ;
 * - `trialEndsAt` est conservé afin de préserver l'historique du trial accordé ;
 * - TrialEligibility n'est volontairement jamais modifié : une identité ayant
 *   consommé un trial ne redevient pas éligible après un retour vers Free ;
 * - la transition et son audit sont atomiques dans une transaction MongoDB.
 *
 * L'autorisation de l'acteur appartient au point d'entrée appelant. Ce service
 * protège le cycle de vie métier de la Subscription et ne dépend pas du
 * transport HTTP ni d'une politique de permissions particulière.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const endTrialToFree = async ({
    workspaceId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !actorId) {
        throw new TypeError(
            'workspaceId and actorId are required to end a trial to free',
        );
    }

    let result;

    await mongoose.connection.transaction(async (session) => {
        const baselineSubscription = await Subscription.findOne({
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.BASELINE,
            status: SUBSCRIPTION_STATUS.ACTIVE,
        }).session(session);

        /*
         * Le retour vers Free repose sur la baseline durable créée avec le
         * workspace. Son absence révèle donc une incohérence interne et ne doit
         * jamais conduire à créer silencieusement une nouvelle Subscription.
         */
        if (!baselineSubscription) {
            throw new AppError(
                'La baseline active de ce workspace est introuvable',
                500,
            );
        }

        const commercialTrial = await Subscription.findOne({
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
        }).session(session);

        if (!commercialTrial) {
            throw new AppError(
                'Aucun trial commercial actif n’est associé à ce workspace',
                409,
            );
        }

        const canceledAt = new Date();

        /*
         * Un trial déjà arrivé à son échéance doit être traité par le futur
         * mécanisme d'expiration naturelle. Le faire passer ici à `canceled`
         * brouillerait la cause réelle de fin du trial dans l'historique.
         */
        if (
            !commercialTrial.trialEndsAt
            || commercialTrial.trialEndsAt <= canceledAt
        ) {
            throw new AppError(
                'Le trial commercial est déjà arrivé à expiration',
                409,
            );
        }

        /*
         * Le statut fait partie du filtre d'écriture afin qu'une transition
         * concurrente ne puisse pas être écrasée entre la lecture et l'update.
         */
        const canceledSubscription =
            await Subscription.findOneAndUpdate(
                {
                    _id: commercialTrial._id,
                    workspace: workspaceId,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.TRIALING,
                },
                {
                    $set: {
                        status: SUBSCRIPTION_STATUS.CANCELED,
                        cancelAtPeriodEnd: false,
                        currentPeriodEnd: canceledAt,
                        updatedBy: actorId,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        if (!canceledSubscription) {
            throw new AppError(
                'Le trial commercial a été modifié avant son annulation',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: canceledSubscription._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: 'trial_voluntary_return_to_free',
                    workspaceId: workspaceId.toString(),
                    previousStatus: SUBSCRIPTION_STATUS.TRIALING,
                    newStatus: SUBSCRIPTION_STATUS.CANCELED,
                    effectiveAt: canceledAt,
                    originalTrialEndsAt: commercialTrial.trialEndsAt,
                    baselineSubscriptionId:
                        baselineSubscription._id.toString(),
                    trialEligibilityPreserved: true,
                },
            },
            { session },
        );

        result = {
            id: canceledSubscription._id.toString(),
            kind: canceledSubscription.kind,
            status: canceledSubscription.status,
            currentPeriodEnd: canceledSubscription.currentPeriodEnd,
            trialEndsAt: canceledSubscription.trialEndsAt,
            effectiveSubscription: {
                id: baselineSubscription._id.toString(),
                kind: baselineSubscription.kind,
                status: baselineSubscription.status,
            },
            updatedAt: canceledSubscription.updatedAt,
        };
    });

    return result;
};


export {
    endTrialToFree,
};
