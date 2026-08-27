import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';

import {
    SUBSCRIPTION_CANCELLATION_MODE,
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


/**
 * Vérifie qu'une souscription peut encore faire l'objet d'une annulation.
 *
 * @param {object} subscription
 */
const assertSubscriptionCanBeCanceled = (subscription) => {
    if (
        subscription.status === SUBSCRIPTION_STATUS.CANCELED
        || subscription.status === SUBSCRIPTION_STATUS.EXPIRED
    ) {
        throw new AppError(
            'Cette souscription ne peut plus être annulée',
            409,
        );
    }
};


/**
 * Construit la mutation correspondant au mode d'annulation demandé.
 *
 * @param {object} subscription
 * @param {string} mode
 * @param {Date} canceledAt
 * @returns {object}
 */
const buildCancellationUpdate = (
    subscription,
    mode,
    canceledAt,
) => {
    if (
        mode
        === SUBSCRIPTION_CANCELLATION_MODE.IMMEDIATE
    ) {
        return {
            status:
                SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: canceledAt,
        };
    }

    if (
        subscription.cancelAtPeriodEnd === true
    ) {
        throw new AppError(
            'L’annulation en fin de période est déjà programmée',
            409,
        );
    }

    if (!subscription.currentPeriodEnd) {
        throw new AppError(
            'Cette souscription ne possède pas de fin de période permettant une annulation différée',
            409,
        );
    }

    return {
        cancelAtPeriodEnd: true,
    };
};


/**
 * Annule une souscription depuis l'administration Platform.
 *
 * L'annulation immédiate constitue une transition vers `canceled`.
 * L'annulation en fin de période conserve le statut courant et programme
 * uniquement la résiliation.
 *
 * @param {object} params
 * @param {string} params.subscriptionId
 * @param {string} params.mode
 * @param {string} params.reason
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const cancelPlatformSubscription = async ({
    subscriptionId,
    mode,
    reason,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !subscriptionId
        || !mode
        || !reason
        || !actorId
    ) {
        throw new TypeError(
            'subscriptionId, mode, reason and actorId are required '
            + 'to cancel a platform subscription',
        );
    }

    let canceledSubscription;

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

            assertSubscriptionCanBeCanceled(
                subscription,
            );

            const canceledAt = new Date();

            const cancellationUpdate =
                buildCancellationUpdate(
                    subscription,
                    mode,
                    canceledAt,
                );

            canceledSubscription =
                await Subscription.findByIdAndUpdate(
                    subscriptionId,
                    {
                        $set: {
                            ...cancellationUpdate,
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
                        AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                    entityType:
                        AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                    entityId:
                        canceledSubscription._id,
                    status:
                        AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        mode,
                        reason,
                        previousStatus:
                            subscription.status,
                        newStatus:
                            canceledSubscription.status,
                        cancelAtPeriodEnd:
                            canceledSubscription
                                .cancelAtPeriodEnd,
                        effectiveAt:
                            mode
                                === SUBSCRIPTION_CANCELLATION_MODE
                                    .IMMEDIATE
                                ? canceledAt
                                : subscription
                                    .currentPeriodEnd,
                    },
                },
                { session },
            );
        },
    );

    return {
        id:
            canceledSubscription._id.toString(),

        status:
            canceledSubscription.status,

        cancelAtPeriodEnd:
            canceledSubscription.cancelAtPeriodEnd,

        currentPeriodEnd:
            canceledSubscription.currentPeriodEnd,

        updatedAt:
            canceledSubscription.updatedAt,
    };
};


export {
    cancelPlatformSubscription,
};