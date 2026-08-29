import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { getWorkspaceOverview } from '../../modules/subscriptions/subscription.controller.js';
import {
    getWorkspaceSubscriptionOverview,
} from '../../modules/subscriptions/services/getWorkspaceSubscriptionOverview.service.js';

vi.mock(
    '../../modules/subscriptions/services/getWorkspaceSubscriptionOverview.service.js',
    () => ({
        getWorkspaceSubscriptionOverview: vi.fn(),
    }),
);

beforeEach(() => {
    getWorkspaceSubscriptionOverview.mockReset();
});

describe('subscription.controller', () => {
    it('retourne le DTO consolidé du workspace courant', async () => {
        const subscription = {
            baseline: {
                status: 'active',
            },
            commercial: null,
            effectiveEntitlement: {
                accessMode: 'normal',
            },
        };

        getWorkspaceSubscriptionOverview.mockResolvedValue(subscription);

        const req = {
            workspace: {
                _id: 'workspace-id',
            },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await getWorkspaceOverview(req, res);

        expect(getWorkspaceSubscriptionOverview).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                subscription,
            },
        });
    });
});