import mongoose from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_TERM_TYPE,
} from '../../constants/subscription.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    cancelActiveSubscriptionImmediately,
    scheduleActiveSubscriptionCancellation,
} from '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

const { ObjectId } = mongoose.Types;
const NOW = new Date('2026-09-08T12:00:00.000Z');

const createOpenEndedSubscription = (overrides = {}) => ({
    _id: new ObjectId(),
    workspace: new ObjectId(),
    plan: new ObjectId(),
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date('2026-09-01T12:00:00.000Z'),
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    billingInterval: BILLING_INTERVAL.NONE,
    currency: 'EUR',
    priceExclTaxMinor: 0,
    provider: BILLING_PROVIDER.MANUAL,
    updatedAt: NOW,
    ...overrides,
});

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

describe('open-ended commercial subscription lifecycle', () => {
    beforeEach(() => {
        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback({ id: 'session' }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('refuse une résiliation en fin de période car aucune échéance n’existe', async () => {
        const subscription = createOpenEndedSubscription();
        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate');

        await expect(scheduleActiveSubscriptionCancellation({
            subscriptionId: subscription._id,
            actorId: new ObjectId(),
            reason: 'test',
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Une souscription sans échéance ne peut pas être résiliée en fin de période',
        });

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('autorise une résiliation immédiate sans fabriquer currentPeriodEnd', async () => {
        const actorId = new ObjectId();
        const subscription = createOpenEndedSubscription();
        const canceled = createOpenEndedSubscription({
            ...subscription,
            status: SUBSCRIPTION_STATUS.CANCELED,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(canceled);
        createAuditLog.mockResolvedValue({});

        const result = await cancelActiveSubscriptionImmediately({
            subscriptionId: subscription._id,
            actorId,
            reason: 'beta_closed',
            canceledAt: NOW,
        });

        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: subscription._id,
                termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                currentPeriodEnd: null,
                billingInterval: BILLING_INTERVAL.NONE,
                priceExclTaxMinor: 0,
                provider: BILLING_PROVIDER.MANUAL,
            }),
            {
                $set: {
                    status: SUBSCRIPTION_STATUS.CANCELED,
                    cancelAtPeriodEnd: false,
                    updatedBy: actorId,
                },
            },
            expect.objectContaining({
                runValidators: true,
            }),
        );
        expect(result.status).toBe(SUBSCRIPTION_STATUS.CANCELED);
        expect(result.currentPeriodEnd).toBeNull();
        expect(result.termType).toBe(SUBSCRIPTION_TERM_TYPE.OPEN_ENDED);
    });

    it('refuse une open-ended incohérente au lieu de la considérer comme permanente', async () => {
        const subscription = createOpenEndedSubscription({
            billingInterval: BILLING_INTERVAL.MONTHLY,
            priceExclTaxMinor: 7900,
        });
        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate');

        await expect(cancelActiveSubscriptionImmediately({
            subscriptionId: subscription._id,
            actorId: new ObjectId(),
            reason: 'test',
            canceledAt: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
            message:
                'La configuration de la souscription sans échéance est incohérente',
        });

        expect(updateSpy).not.toHaveBeenCalled();
    });
});
