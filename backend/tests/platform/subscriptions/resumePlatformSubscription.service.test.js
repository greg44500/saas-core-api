import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import {
    resumeScheduledSubscriptionCancellation,
} from '../../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';
import {
    resumePlatformSubscription,
} from '../../../modules/platform/subscriptions/services/resumePlatformSubscription.service.js';


vi.mock(
    '../../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js',
    () => ({
        resumeScheduledSubscriptionCancellation: vi.fn(),
    }),
);


describe('resumePlatformSubscription', () => {
    const actorId = '507f1f77bcf86cd799439011';
    const subscriptionId = '507f191e810c19729de860ea';
    const currentPeriodEnd = new Date('2026-09-01T00:00:00.000Z');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('refuse les paramètres obligatoires manquants avant le domaine métier', async () => {
        await expect(
            resumePlatformSubscription({
                subscriptionId: null,
                actorId,
            }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(resumeScheduledSubscriptionCancellation)
            .not.toHaveBeenCalled();
    });

    it('délègue la reprise au domaine Subscription', async () => {
        const updatedAt = new Date();

        resumeScheduledSubscriptionCancellation.mockResolvedValue({
            id: subscriptionId,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            updatedAt,
        });

        const result = await resumePlatformSubscription({
            subscriptionId,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });

        expect(resumeScheduledSubscriptionCancellation).toHaveBeenCalledWith({
            subscriptionId,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });
        expect(result).toEqual({
            id: subscriptionId,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            updatedAt,
        });
    });

    it('propage les erreurs métier du domaine Subscription', async () => {
        const error = Object.assign(
            new Error('Aucune annulation programmée'),
            { statusCode: 409 },
        );

        resumeScheduledSubscriptionCancellation.mockRejectedValue(error);

        await expect(
            resumePlatformSubscription({
                subscriptionId,
                actorId,
            }),
        ).rejects.toBe(error);
    });
});
