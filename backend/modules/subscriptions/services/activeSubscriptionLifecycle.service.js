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
import { AppError } from '../../../utils/appError.js';
import { createAuditLog } from '../../auditLog/auditLog.service.js';
import { Subscription } from '../subscription.model.js';

const DEFAULT_CANCELLATION_FINALIZATION_BATCH_SIZE = 100;
const MAX_CANCELLATION_FINALIZATION_BATCH_SIZE = 500;

const assertValidDate = (value, fieldName) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new TypeError(`${fieldName} must be a valid Date`);
    }
};

const assertValidCancellationBatchSize = (batchSize) => {
    if (
        !Number.isInteger(batchSize)
        || batchSize <= 0
        || batchSize > MAX_CANCELLATION_FINALIZATION_BATCH_SIZE
    ) {
        throw new TypeError(
            `batchSize must be an integer between 1 and ${MAX_CANCELLATION_FINALIZATION_BATCH_SIZE}`,
        );
    }
};

const buildSubscriptionLifecycleDto = (subscription) => ({
    id: subscription._id.toString(),
    workspace: subscription.workspace?.toString() ?? null,
    plan: subscription.plan?.toString() ?? null,
    kind: subscription.kind,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    billingInterval: subscription.billingInterval,
    currency: subscription.currency,
    priceExclTaxMinor: subscription.priceExclTaxMinor,
    provider: subscription.provider,
    updatedAt: subscription.updatedAt,
});

const assertActiveCommercialSubscription = ({ subscription, now }) => {
    if (subscription.kind !== SUBSCRIPTION_KIND.COMMERCIAL) {
        throw new AppError(
            'Seule une souscription commerciale peut utiliser ce cycle de résiliation',
            409,
        );
    }
    if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
        throw new AppError(
            'Cette opération nécessite une souscription commerciale active',
            409,
        );
    }
    if (
        !(subscription.currentPeriodEnd instanceof Date)
        || subscription.currentPeriodEnd <= now
    ) {
        throw new AppError(
            'La période contractuelle de cette souscription est déjà terminée',
            409,
        );
    }
};

const scheduleActiveSubscriptionCancellation = async ({
    subscriptionId,
    actorId,
    reason = null,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !actorId) {
        throw new TypeError(
            'subscriptionId and actorId are required to schedule a subscription cancellation',
        );
    }
    assertValidDate(now, 'now');
    let result;
    await mongoose.connection.transaction(async (session) => {
        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Souscription introuvable', 404);
        assertActiveCommercialSubscription({ subscription, now });
        if (subscription.cancelAtPeriodEnd === true) {
            throw new AppError('L’annulation en fin de période est déjà programmée', 409);
        }
        result = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                cancelAtPeriodEnd: false,
                currentPeriodEnd: mongoose.trusted({ $type: 'date', $gt: now }),
            },
            { $set: { cancelAtPeriodEnd: true, updatedBy: actorId } },
            { returnDocument: 'after', runValidators: true, session },
        );
        if (!result) throw new AppError('La souscription a été modifiée concurremment', 409);
        await createAuditLog({
            actor: actorId,
            action: AUDIT_ACTION.SUBSCRIPTION_CANCELLATION_SCHEDULED,
            entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
            entityId: result._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                reason,
                effectiveAt: subscription.currentPeriodEnd,
                previousCancelAtPeriodEnd: false,
                cancelAtPeriodEnd: true,
            },
        }, { session });
    });
    return buildSubscriptionLifecycleDto(result);
};

const resumeScheduledSubscriptionCancellation = async ({
    subscriptionId,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !actorId) {
        throw new TypeError(
            'subscriptionId and actorId are required to resume a scheduled subscription cancellation',
        );
    }
    assertValidDate(now, 'now');
    let result;
    await mongoose.connection.transaction(async (session) => {
        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Souscription introuvable', 404);
        assertActiveCommercialSubscription({ subscription, now });
        if (subscription.cancelAtPeriodEnd !== true) {
            throw new AppError('Aucune annulation en fin de période n’est programmée', 409);
        }
        result = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                cancelAtPeriodEnd: true,
                currentPeriodEnd: mongoose.trusted({ $type: 'date', $gt: now }),
            },
            { $set: { cancelAtPeriodEnd: false, updatedBy: actorId } },
            { returnDocument: 'after', runValidators: true, session },
        );
        if (!result) throw new AppError('La souscription a été modifiée concurremment', 409);
        await createAuditLog({
            actor: actorId,
            action: AUDIT_ACTION.SUBSCRIPTION_RESUMED,
            entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
            entityId: result._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                reason: 'scheduled_cancellation_revoked',
                effectiveAt: subscription.currentPeriodEnd,
                previousCancelAtPeriodEnd: true,
                cancelAtPeriodEnd: false,
            },
        }, { session });
    });
    return buildSubscriptionLifecycleDto(result);
};

const cancelActiveSubscriptionImmediately = async ({
    subscriptionId,
    actorId,
    reason,
    canceledAt = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !actorId || !reason) {
        throw new TypeError(
            'subscriptionId, actorId and reason are required to cancel an active subscription immediately',
        );
    }
    assertValidDate(canceledAt, 'canceledAt');
    let result;
    await mongoose.connection.transaction(async (session) => {
        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Souscription introuvable', 404);
        assertActiveCommercialSubscription({ subscription, now: canceledAt });
        const previousPeriodEnd = subscription.currentPeriodEnd;
        result = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodEnd: mongoose.trusted({ $type: 'date', $gt: canceledAt }),
            },
            {
                $set: {
                    status: SUBSCRIPTION_STATUS.CANCELED,
                    cancelAtPeriodEnd: false,
                    currentPeriodEnd: canceledAt,
                    updatedBy: actorId,
                },
            },
            { returnDocument: 'after', runValidators: true, session },
        );
        if (!result) throw new AppError('La souscription a été modifiée concurremment', 409);
        await createAuditLog({
            actor: actorId,
            action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
            entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
            entityId: result._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                mode: 'immediate',
                reason,
                previousStatus: SUBSCRIPTION_STATUS.ACTIVE,
                newStatus: SUBSCRIPTION_STATUS.CANCELED,
                previousPeriodEnd,
                effectiveAt: canceledAt,
            },
        }, { session });
    });
    return buildSubscriptionLifecycleDto(result);
};

/**
 * Finalise un lot borné d'annulations programmées arrivées à échéance.
 *
 * Les droits cessent déjà à currentPeriodEnd via l'entitlement fail-closed.
 * Le batch évite une lecture non bornée et le filtre conditionnel rend chaque
 * transition idempotente et sûre face à plusieurs workers.
 */
const finalizeScheduledCancellations = async ({
    now = new Date(),
    batchSize = DEFAULT_CANCELLATION_FINALIZATION_BATCH_SIZE,
} = {}) => {
    assertValidDate(now, 'now');
    assertValidCancellationBatchSize(batchSize);

    const candidates = await Subscription.find({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: mongoose.trusted({ $type: 'date', $lte: now }),
    })
        .sort({ currentPeriodEnd: 1, _id: 1 })
        .limit(batchSize);

    let canceled = 0;
    let skipped = 0;

    for (const candidate of candidates) {
        let transitioned = false;
        await mongoose.connection.transaction(async (session) => {
            const updated = await Subscription.findOneAndUpdate(
                {
                    _id: candidate._id,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    cancelAtPeriodEnd: true,
                    currentPeriodEnd: mongoose.trusted({ $type: 'date', $lte: now }),
                },
                { $set: { status: SUBSCRIPTION_STATUS.CANCELED, cancelAtPeriodEnd: false, updatedBy: null } },
                { returnDocument: 'after', runValidators: true, session },
            );
            if (!updated) return;
            await createAuditLog({
                actor: null,
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: updated._id,
                status: AUDIT_STATUS.SUCCESS,
                metadata: {
                    mode: 'period_end',
                    reason: 'scheduled_cancellation_effective',
                    previousStatus: SUBSCRIPTION_STATUS.ACTIVE,
                    newStatus: SUBSCRIPTION_STATUS.CANCELED,
                    effectiveAt: candidate.currentPeriodEnd,
                    processedAt: now,
                    baselineFallbackEnabled: true,
                },
            }, { session });
            transitioned = true;
        });
        if (transitioned) canceled += 1;
        else skipped += 1;
    }

    return {
        processedAt: now,
        scanned: candidates.length,
        canceled,
        skipped,
        hasMore: candidates.length === batchSize,
    };
};

export {
    DEFAULT_CANCELLATION_FINALIZATION_BATCH_SIZE,
    MAX_CANCELLATION_FINALIZATION_BATCH_SIZE,
    buildSubscriptionLifecycleDto,
    cancelActiveSubscriptionImmediately,
    finalizeScheduledCancellations,
    resumeScheduledSubscriptionCancellation,
    scheduleActiveSubscriptionCancellation,
};
