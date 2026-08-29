import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    scheduleActiveSubscriptionCancellation,
} from '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';
import {
    scheduleWorkspaceSubscriptionCancellation,
} from '../../modules/subscriptions/services/workspaceSubscriptionCommands.service.js';

vi.mock('../../modules/subscriptions/subscription.model.js', () => ({
    Subscription: {
        findOne: vi.fn(),
    },
}));

vi.mock(
    '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js',
    () => ({
        resumeScheduledSubscriptionCancellation: vi.fn(),
        scheduleActiveSubscriptionCancellation: vi.fn(),
    }),
);

vi.mock(
    '../../modules/subscriptions/services/endTrialToFree.service.js',
    () => ({
        endTrialToFree: vi.fn(),
    }),
);

vi.mock(
    '../../modules/subscriptions/services/grantTrial.service.js',
    () => ({
        grantTrial: vi.fn(),
    }),
);

vi.mock(
    '../../modules/subscriptions/services/scheduledDowngrade.service.js',
    () => ({
        revokeScheduledSubscriptionDowngrade: vi.fn(),
        scheduleSubscriptionDowngrade: vi.fn(),
    }),
);

const mockSubscriptionLookup = (result) => {
    const select = vi.fn().mockResolvedValue(result);
    Subscription.findOne.mockReturnValue({ select });
    return select;
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('workspaceSubscriptionCommands', () => {
    it('refuse une subscription qui n’appartient pas au workspace courant', async () => {
        mockSubscriptionLookup(null);

        await expect(
            scheduleWorkspaceSubscriptionCancellation({
                workspaceId: 'workspace-a',
                subscriptionId: 'subscription-b',
                actorId: 'owner-a',
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(Subscription.findOne).toHaveBeenCalledWith({
            _id: 'subscription-b',
            workspace: 'workspace-a',
        });
        expect(
            scheduleActiveSubscriptionCancellation,
        ).not.toHaveBeenCalled();
    });

    it('délègue à la primitive métier après contrôle de la frontière tenant', async () => {
        mockSubscriptionLookup({ _id: 'subscription-a' });

        const expected = {
            id: 'subscription-a',
            cancelAtPeriodEnd: true,
        };

        scheduleActiveSubscriptionCancellation.mockResolvedValue(expected);

        const result = await scheduleWorkspaceSubscriptionCancellation({
            workspaceId: 'workspace-a',
            subscriptionId: 'subscription-a',
            actorId: 'owner-a',
            reason: 'Fin de besoin',
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });

        expect(scheduleActiveSubscriptionCancellation).toHaveBeenCalledWith({
            subscriptionId: 'subscription-a',
            actorId: 'owner-a',
            reason: 'Fin de besoin',
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });
        expect(result).toEqual(expected);
    });
});
