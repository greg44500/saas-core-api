import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    getWorkspaceOverview,
    scheduleCancellation,
} from '../../modules/subscriptions/subscription.controller.js';
import {
    getWorkspaceSubscriptionOverview,
} from '../../modules/subscriptions/services/getWorkspaceSubscriptionOverview.service.js';
import {
    scheduleWorkspaceSubscriptionCancellation,
} from '../../modules/subscriptions/services/workspaceSubscriptionCommands.service.js';

vi.mock(
    '../../modules/subscriptions/services/getWorkspaceSubscriptionOverview.service.js',
    () => ({
        getWorkspaceSubscriptionOverview: vi.fn(),
    }),
);

vi.mock(
    '../../modules/subscriptions/services/workspaceSubscriptionCommands.service.js',
    () => ({
        endWorkspaceTrialToFree: vi.fn(),
        grantWorkspaceTrial: vi.fn(),
        resumeWorkspaceSubscriptionCancellation: vi.fn(),
        revokeWorkspaceSubscriptionDowngrade: vi.fn(),
        scheduleWorkspaceSubscriptionCancellation: vi.fn(),
        scheduleWorkspaceSubscriptionDowngrade: vi.fn(),
    }),
);

beforeEach(() => {
    vi.clearAllMocks();
});

const createResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

describe('subscription.controller', () => {
    it('retourne le DTO consolidé du workspace courant', async () => {
        const subscription = {
            baseline: { status: 'active' },
            commercial: null,
            effectiveEntitlement: { accessMode: 'normal' },
        };

        getWorkspaceSubscriptionOverview.mockResolvedValue(subscription);

        const req = {
            workspace: { _id: 'workspace-id' },
        };
        const res = createResponse();

        await getWorkspaceOverview(req, res);

        expect(getWorkspaceSubscriptionOverview).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { subscription },
        });
    });

    it('transmet uniquement le contexte serveur à la programmation d’annulation', async () => {
        const subscription = {
            id: 'subscription-id',
            cancelAtPeriodEnd: true,
        };

        scheduleWorkspaceSubscriptionCancellation.mockResolvedValue(
            subscription,
        );

        const req = {
            workspace: { _id: 'workspace-id' },
            user: { id: 'owner-id' },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest',
            },
            validated: {
                params: { subscriptionId: 'subscription-id' },
                body: { reason: 'Fin de besoin' },
            },
        };
        const res = createResponse();

        await scheduleCancellation(req, res);

        expect(
            scheduleWorkspaceSubscriptionCancellation,
        ).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            subscriptionId: 'subscription-id',
            actorId: 'owner-id',
            reason: 'Fin de besoin',
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { subscription },
        });
    });
});
