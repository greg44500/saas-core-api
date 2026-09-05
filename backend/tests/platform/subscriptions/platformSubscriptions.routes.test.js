import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    authenticate,
} from '../../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';
import {
    platformRouter,
} from '../../../modules/platform/platform.routes.js';
import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';
import {
    cancelPlatformSubscriptionBodySchema,
    grantTrialBodySchema,
    platformSubscriptionIdParamsSchema,
    updatePlatformSubscriptionBodySchema,
} from '../../../modules/platform/subscriptions/platformSubscriptions.validation.js';

const {
    permissionMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
        listSubscriptions: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        grantSubscriptionTrial: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        getSubscriptionById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        updateSubscription: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        cancelSubscription: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        resumeSubscription: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    },
}));

vi.mock('../../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { _id: 'user-id', id: 'user-id' };
        next();
    }),
}));
vi.mock('../../../middlewares/authorizePlatformPermission.js', () => ({
    authorizePlatformPermission: vi.fn(() => permissionMiddleware),
}));
vi.mock('../../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));
vi.mock(
    '../../../modules/platform/subscriptions/platformSubscriptions.controller.js',
    () => handlers,
);

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

beforeEach(() => {
    authenticate.mockClear();
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});


describe('platformSubscriptions.routes', () => {
    const subscriptionId = '507f1f77bcf86cd799439011';

    const cases = [
        {
            label: 'liste',
            method: 'get',
            path: '/platform/subscriptions?page=1&limit=20',
            permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
            validation: { query: paginationQuerySchema },
            handler: handlers.listSubscriptions,
        },
        {
            label: 'trial',
            method: 'post',
            path: '/platform/subscriptions/grant-trial',
            permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_GRANT_TRIAL,
            body: {
                workspaceId: '507f1f77bcf86cd799439011',
                planId: '507f191e810c19729de860ea',
                billingInterval: 'monthly',
            },
            validation: { body: grantTrialBodySchema },
            handler: handlers.grantSubscriptionTrial,
        },
        {
            label: 'détail',
            method: 'get',
            path: `/platform/subscriptions/${subscriptionId}`,
            permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
            validation: { params: platformSubscriptionIdParamsSchema },
            handler: handlers.getSubscriptionById,
        },
        {
            label: 'mise à jour',
            method: 'patch',
            path: `/platform/subscriptions/${subscriptionId}`,
            permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_UPDATE,
            body: { cancelAtPeriodEnd: true },
            validation: {
                params: platformSubscriptionIdParamsSchema,
                body: updatePlatformSubscriptionBodySchema,
            },
            handler: handlers.updateSubscription,
        },
        {
            label: 'annulation',
            method: 'patch',
            path: `/platform/subscriptions/${subscriptionId}/cancel`,
            permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_CANCEL,
            body: {
                mode: 'period_end',
                reason: 'Résiliation à échéance',
            },
            validation: {
                params: platformSubscriptionIdParamsSchema,
                body: cancelPlatformSubscriptionBodySchema,
            },
            handler: handlers.cancelSubscription,
        },
        {
            label: 'reprise',
            method: 'patch',
            path: `/platform/subscriptions/${subscriptionId}/resume`,
            permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_RESUME,
            validation: { params: platformSubscriptionIdParamsSchema },
            handler: handlers.resumeSubscription,
        },
    ];

    it.each(cases)(
        'protège et valide $label avec la permission exacte',
        async ({ method, path, body, permission, validation, handler }) => {
            let pendingRequest = request(app)[method](path);
            if (body) pendingRequest = pendingRequest.send(body);

            const response = await pendingRequest;

            expect(response.status).toBe(200);
            expect(authorizePlatformPermission.mock.calls).toContainEqual([
                permission,
            ]);
            expect(validateRequest.mock.calls).toContainEqual([validation]);
            expect(authenticate).toHaveBeenCalledOnce();
            expect(permissionMiddleware).toHaveBeenCalledOnce();
            expect(validationMiddleware).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledOnce();
        },
    );
});
