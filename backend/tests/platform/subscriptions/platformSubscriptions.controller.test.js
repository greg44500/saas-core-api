import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    grantTrial,
} from '../../../modules/subscriptions/services/grantTrial.service.js';

import {
    grantSubscriptionTrial,
} from '../../../modules/platform/subscriptions/platformSubscriptions.controller.js';


vi.mock(
    '../../../modules/subscriptions/services/grantTrial.service.js',
    () => ({
        grantTrial: vi.fn(),
    }),
);


describe('grantSubscriptionTrial', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('délègue l’attribution du trial au service avec le contexte authentifié', async () => {
        const subscription = {
            id: '507f191e810c19729de860ed',
            kind: 'commercial',
            status: 'trialing',
        };

        grantTrial.mockResolvedValue(subscription);

        const req = {
            validated: {
                body: {
                    workspaceId:
                        '507f1f77bcf86cd799439011',
                    planId:
                        '507f191e810c19729de860ea',
                    billingInterval: 'monthly',
                },
            },
            user: {
                _id:
                    '507f191e810c19729de860eb',
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest',
            },
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await grantSubscriptionTrial(req, res);

        expect(grantTrial).toHaveBeenCalledWith({
            workspaceId:
                req.validated.body.workspaceId,
            planId:
                req.validated.body.planId,
            billingInterval:
                req.validated.body.billingInterval,
            actorId: req.user._id,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
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
