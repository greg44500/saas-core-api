import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';

import {
    SUBSCRIPTION_STATUS,
} from '../../../../constants/subscription.constants.js';

import {
    AppError,
} from '../../../../utils/appError.js';

import {
    createAuditLog,
} from '../../../auditLog/auditLog.service.js';

import {
    Subscription,
} from '../../../subscriptions/subscription.model.js';


const RESUMABLE_STATUSES = new Set([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
]);


/**
 * Retire une annulation programmée en fin de période.
 *
 * Une souscription déjà annulée ou expirée n'est jamais réactivée par cette
 * action : elle appartient désormais à l'historique.
 *
 * @param {object} params
 * @param {string} params.subscriptionId
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const resumePlatformSubscription = async ({
    subscriptionId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !actorId) {
        throw new TypeError(
            'subscriptionId and actorId are required '
            + 'to resume a platform subscription',
        );
    }

    let resumedSubscription;

    await mongoose.connection.transaction(
        async (session) => {
            const subscription =
                await Subscription.findById(
                    subscriptionId,
                ).session(session);

            if (!subscription) {
                throw new AppError(
                    'Souscription introuvable',
                    404,
                );
            }

            if (
                !RESUMABLE_STATUSES.has(
                    subscription.status,
                )
            ) {
                throw new AppError(
                    'Cette souscription ne peut pas être réactivée',
                    409,
                );
            }

            if (
                subscription.cancelAtPeriodEnd
                !== true
            ) {
                throw new AppError(
                    'Aucune annulation en fin de période n’est programmée',
                    409,
                );
            }

            resumedSubscription =
                await Subscription.findByIdAndUpdate(
                    subscriptionId,
                    {
                        $set: {
                            cancelAtPeriodEnd: false,
                            updatedBy: actorId,
                        },
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

            await createAuditLog(
                {
                    actor: actorId,
                    action:
                        AUDIT_ACTION.SUBSCRIPTION_RESUMED,
                    entityType:
                        AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                    entityId:
                        resumedSubscription._id,
                    status:
                        AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        status:
                            resumedSubscription.status,
                        previousCancelAtPeriodEnd:
                            true,
                        cancelAtPeriodEnd:
                            false,
                    },
                },
                { session },
            );
        },
    );

    return {
        id:
            resumedSubscription._id.toString(),
        status:
            resumedSubscription.status,
        cancelAtPeriodEnd:
            resumedSubscription.cancelAtPeriodEnd,
        currentPeriodEnd:
            resumedSubscription.currentPeriodEnd,
        updatedAt:
            resumedSubscription.updatedAt,
    };
};


export {
    resumePlatformSubscription,
};