import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    SUBSCRIPTION_CANCELLATION_MODE,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import {
    cancelActiveSubscriptionImmediately,
    scheduleActiveSubscriptionCancellation,
} from '../../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';
import {
    cancelPlatformSubscription,
} from '../../../modules/platform/subscriptions/services/cancelPlatformSubscription.service.js';


vi.mock(
    '../../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js',
    () => ({
        cancelActiveSubscriptionImmediately: vi.fn(),
        scheduleActiveSubscriptionCancellation: vi.fn(),
    }),
);


describe('cancelPlatformSubscription', () => {
    const actorId = '507f1f77bcf86cd799439011';
    const subscriptionId = '507f191e810c19729de860ea';
    const currentPeriodEnd = new Date('2026-09-01T00:00:00.000Z');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('refuse les paramètres obligatoires manquants avant le domaine métier', async () => {
        await expect(
            cancelPlatformSubscription({
                subscriptionId: null,
                mode: SUBSCRIPTION_CANCELLATION_MODE.IMMEDIATE,
                reason: 'Résiliation administrative',
                actorId,
            }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(cancelActiveSubscriptionImmediately)
            .not.toHaveBeenCalled();
        expect(scheduleActiveSubscriptionCancellation)
            .not.toHaveBeenCalled();
    });

    it('refuse un mode inconnu avant le domaine métier', async () => {
        await expect(
            cancelPlatformSubscription({
                subscriptionId,
                mode: 'unknown',
                reason: 'Résiliation administrative',
                actorId,
            }),
        ).rejects.toThrow(
            'mode must be immediate or period_end to cancel a platform subscription',
        );

        expect(cancelActiveSubscriptionImmediately)
            .not.toHaveBeenCalled();
        expect(scheduleActiveSubscriptionCancellation)
            .not.toHaveBeenCalled();
    });

    it('délègue une annulation immédiate au domaine Subscription', async () => {
        const updatedAt = new Date();

        cancelActiveSubscriptionImmediately.mockResolvedValue({
            id: subscriptionId,
            status: SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            updatedAt,
        });

        const result = await cancelPlatformSubscription({
            subscriptionId,
            mode: SUBSCRIPTION_CANCELLATION_MODE.IMMEDIATE,
            reason: 'Résiliation administrative',
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });

        expect(cancelActiveSubscriptionImmediately).toHaveBeenCalledWith({
            subscriptionId,
            actorId,
            reason: 'Résiliation administrative',
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });
        expect(scheduleActiveSubscriptionCancellation)
            .not.toHaveBeenCalled();
        expect(result).toEqual({
            id: subscriptionId,
            status: SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            updatedAt,
        });
    });

    it('délègue une annulation en fin de période au domaine Subscription', async () => {
        const updatedAt = new Date();

        scheduleActiveSubscriptionCancellation.mockResolvedValue({
            id: subscriptionId,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: true,
            currentPeriodEnd,
            updatedAt,
        });

        const result = await cancelPlatformSubscription({
            subscriptionId,
            mode: SUBSCRIPTION_CANCELLATION_MODE.PERIOD_END,
            reason: 'Résiliation à échéance',
            actorId,
        });

        expect(scheduleActiveSubscriptionCancellation).toHaveBeenCalledWith({
            subscriptionId,
            actorId,
            reason: 'Résiliation à échéance',
            ipAddress: null,
            userAgent: null,
        });
        expect(cancelActiveSubscriptionImmediately)
            .not.toHaveBeenCalled();
        expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('propage les erreurs métier du domaine Subscription', async () => {
        const error = Object.assign(
            new Error('Souscription introuvable'),
            { statusCode: 404 },
        );

        cancelActiveSubscriptionImmediately.mockRejectedValue(error);

        await expect(
            cancelPlatformSubscription({
                subscriptionId,
                mode: SUBSCRIPTION_CANCELLATION_MODE.IMMEDIATE,
                reason: 'Résiliation administrative',
                actorId,
            }),
        ).rejects.toBe(error);
    });
});
