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
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { getWorkspaceOverview } from '../../modules/subscriptions/subscription.controller.js';
import { subscriptionRouter } from '../../modules/subscriptions/subscription.routes.js';
import {
    workspaceIdParamsSchema,
} from '../../modules/workspace/workspace.validation.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => {
        next();
    }),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = {
            _id: 'workspace-id',
        };
        req.permissions = ['subscription:read'];
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => {
        next();
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            id: 'user-id',
        };
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

vi.mock(
    '../../modules/subscriptions/subscription.controller.js',
    () => ({
        getWorkspaceOverview: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
    }),
);

beforeEach(() => {
    authenticate.mockClear();
    validationMiddleware.mockClear();
    workspaceContextMiddleware.mockClear();
    permissionMiddleware.mockClear();
    getWorkspaceOverview.mockClear();
});

describe('subscription.routes', () => {
    it('protège la lecture avec le contexte tenant et subscription:read', async () => {
        const app = express();

        app.use(
            '/workspaces/:workspaceId/subscription',
            subscriptionRouter,
        );

        const response = await request(app)
            .get(
                '/workspaces/507f1f77bcf86cd799439011/subscription',
            );

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalledOnce();

        /*
         * validateRequest et authorizePermission sont des factories exécutées
         * lors de la construction du router, donc à l'import du module. On ne
         * les efface pas dans beforeEach : la requête exécute ensuite les
         * middlewares déjà construits, pas les factories elles-mêmes.
         */
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.SUBSCRIPTION_READ,
        );

        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(loadWorkspaceContext).toHaveBeenCalledOnce();
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(getWorkspaceOverview).toHaveBeenCalledOnce();
        expect(
            permissionMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            getWorkspaceOverview.mock.invocationCallOrder[0],
        );
    });
});
