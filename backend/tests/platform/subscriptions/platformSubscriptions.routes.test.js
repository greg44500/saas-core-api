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
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';

import {
    authenticate,
} from '../../../middlewares/authenticate.js';

import {
    authorizePlatformRole,
} from '../../../middlewares/authorizePlatformRole.js';

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
    platformRoleMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    platformRoleMiddleware: vi.fn(
        (req, res, next) => next(),
    ),

    validationMiddleware: vi.fn(
        (req, res, next) => next(),
    ),

    handlers: {
        listSubscriptions: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        grantSubscriptionTrial: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        getSubscriptionById: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        updateSubscription: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        cancelSubscription: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        resumeSubscription: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
    },
}));


vi.mock(
    '../../../middlewares/authenticate.js',
    () => ({
        authenticate: vi.fn(
            (req, res, next) => {
                req.user = {
                    _id: 'user-id',
                    id: 'user-id',
                    platformRole:
                        PLATFORM_ROLE.SUPER_ADMIN,
                };

                next();
            },
        ),
    }),
);

vi.mock(
    '../../../middlewares/authorizePlatformRole.js',
    () => ({
        authorizePlatformRole: vi.fn(
            () => platformRoleMiddleware,
        ),
    }),
);

vi.mock(
    '../../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn(
            () => validationMiddleware,
        ),
    }),
);

vi.mock(
    '../../../modules/platform/subscriptions/platformSubscriptions.controller.js',
    () => handlers,
);


const app = express();

app.use(express.json());

app.use(
    '/platform',
    platformRouter,
);


beforeEach(() => {
    authenticate.mockClear();

    platformRoleMiddleware.mockClear();
    validationMiddleware.mockClear();

    Object.values(handlers).forEach(
        (handler) => {
            handler.mockClear();
        },
    );
});


describe('platformSubscriptions.routes', () => {
    it('protège et valide la liste des souscriptions avant le controller', async () => {
        const response = await request(app)
            .get(
                '/platform/subscriptions?page=1&limit=20',
            );

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            query: paginationQuerySchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.listSubscriptions,
        ).toHaveBeenCalledOnce();
    });


    it('protège et valide l’attribution d’un trial avant le controller', async () => {
        const response = await request(app)
            .post(
                '/platform/subscriptions/grant-trial',
            )
            .send({
                workspaceId:
                    '507f1f77bcf86cd799439011',
                planId:
                    '507f191e810c19729de860ea',
                billingInterval: 'monthly',
            });

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            body: grantTrialBodySchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.grantSubscriptionTrial,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.getSubscriptionById,
        ).not.toHaveBeenCalled();
    });


    it('protège et valide le détail d’une souscription avant le controller', async () => {
        const subscriptionId =
            '507f1f77bcf86cd799439011';

        const response = await request(app)
            .get(
                `/platform/subscriptions/${subscriptionId}`,
            );

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params:
                platformSubscriptionIdParamsSchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.getSubscriptionById,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.listSubscriptions,
        ).not.toHaveBeenCalled();
    });


    it('protège et valide la mise à jour d’une souscription avant le controller', async () => {
        const subscriptionId =
            '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(
                `/platform/subscriptions/${subscriptionId}`,
            )
            .send({
                cancelAtPeriodEnd: true,
            });

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params:
                platformSubscriptionIdParamsSchema,
            body:
                updatePlatformSubscriptionBodySchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.updateSubscription,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.getSubscriptionById,
        ).not.toHaveBeenCalled();

        expect(
            handlers.listSubscriptions,
        ).not.toHaveBeenCalled();
    });


    it('protège et valide l’annulation d’une souscription avant le controller', async () => {
        const subscriptionId =
            '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(
                `/platform/subscriptions/${subscriptionId}/cancel`,
            )
            .send({
                mode: 'period_end',
                reason: 'Résiliation à échéance',
            });

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params:
                platformSubscriptionIdParamsSchema,
            body:
                cancelPlatformSubscriptionBodySchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.cancelSubscription,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.updateSubscription,
        ).not.toHaveBeenCalled();
    });


    it('protège et valide la reprise d’une souscription avant le controller', async () => {
        const subscriptionId =
            '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(
                `/platform/subscriptions/${subscriptionId}/resume`,
            );

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params:
                platformSubscriptionIdParamsSchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.resumeSubscription,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.cancelSubscription,
        ).not.toHaveBeenCalled();

        expect(
            handlers.updateSubscription,
        ).not.toHaveBeenCalled();
    });
});
