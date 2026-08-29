import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { authorizeWorkspaceOwner } from '../../middlewares/authorizeWorkspaceOwner.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    endTrialToFree,
    getWorkspaceOverview,
    grantTrial,
    resumeCancellation,
    revokeDowngrade,
    scheduleCancellation,
    scheduleDowngrade,
} from '../../modules/subscriptions/subscription.controller.js';
import { subscriptionRouter } from '../../modules/subscriptions/subscription.routes.js';
import {
    grantTrialBodySchema,
    workspaceIdParamsSchema,
} from '../../modules/subscriptions/subscription.validation.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
    ownerMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => next()),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: 'workspace-id' };
        req.permissions = ['subscription:read'];
        req.role = { key: 'owner', isSystem: true };
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    ownerMiddleware: vi.fn((req, res, next) => next()),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { id: 'user-id' };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: workspaceContextMiddleware,
}));

vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(() => permissionMiddleware),
}));

vi.mock('../../middlewares/authorizeWorkspaceOwner.js', () => ({
    authorizeWorkspaceOwner: ownerMiddleware,
}));

vi.mock(
    '../../modules/subscriptions/subscription.controller.js',
    () => {
        const handler = () => vi.fn((req, res) => {
            res.status(200).json({ status: 'success' });
        });

        return {
            endTrialToFree: handler(),
            getWorkspaceOverview: handler(),
            grantTrial: handler(),
            resumeCancellation: handler(),
            revokeDowngrade: handler(),
            scheduleCancellation: handler(),
            scheduleDowngrade: handler(),
        };
    },
);

beforeEach(() => {
    authenticate.mockClear();
    validationMiddleware.mockClear();
    workspaceContextMiddleware.mockClear();
    permissionMiddleware.mockClear();
    ownerMiddleware.mockClear();
    endTrialToFree.mockClear();
    getWorkspaceOverview.mockClear();
    grantTrial.mockClear();
    resumeCancellation.mockClear();
    revokeDowngrade.mockClear();
    scheduleCancellation.mockClear();
    scheduleDowngrade.mockClear();
});

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(
        '/workspaces/:workspaceId/subscription',
        subscriptionRouter,
    );
    return app;
};

describe('subscription.routes', () => {
    it('protège la lecture avec subscription:read sans exiger owner', async () => {
        const response = await request(createApp())
            .get('/workspaces/507f1f77bcf86cd799439011/subscription');

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.SUBSCRIPTION_READ,
        );
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(ownerMiddleware).not.toHaveBeenCalled();
        expect(getWorkspaceOverview).toHaveBeenCalledOnce();
    });

    it('réserve le démarrage du trial au propriétaire après validation', async () => {
        const response = await request(createApp())
            .post('/workspaces/507f1f77bcf86cd799439011/subscription/trial')
            .send({
                planId: '507f1f77bcf86cd799439012',
                billingInterval: 'monthly',
            });

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
            body: grantTrialBodySchema,
        });
        expect(workspaceContextMiddleware).toHaveBeenCalledOnce();
        expect(ownerMiddleware).toHaveBeenCalledOnce();
        expect(permissionMiddleware).not.toHaveBeenCalled();
        expect(grantTrial).toHaveBeenCalledOnce();
        expect(
            ownerMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            grantTrial.mock.invocationCallOrder[0],
        );
    });
});
