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
    createPlatformPlanBodySchema,
    platformPlanIdParamsSchema,
    updatePlatformPlanBodySchema,
} from '../../../modules/platform/plans/platformPlans.validation.js';

import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';


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
        createPlan: vi.fn(
            (req, res) =>
                res.status(201).json({
                    status: 'success',
                }),
        ),

        listPlans: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        updatePlan: vi.fn(
            (req, res) =>
                res.status(200).json({
                    status: 'success',
                }),
        ),
        archivePlan: vi.fn(
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
    '../../../modules/platform/plans/platformPlans.controller.js',
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


describe('platformPlans.routes', () => {
    it('protège et valide la liste des plans avant le controller', async () => {
        const response = await request(app)
            .get(
                '/platform/plans?page=1&limit=20',
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
            handlers.listPlans,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.createPlan,
        ).not.toHaveBeenCalled();
    });


    it('protège et valide la création d’un plan avant le controller', async () => {
        const response = await request(app)
            .post('/platform/plans')
            .send({
                key: 'starter',
                name: 'Starter',
                currency: 'EUR',
                priceMonthlyExclTaxMinor: 1990,
                priceYearlyExclTaxMinor: 19900,
            });

        expect(response.status).toBe(201);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            body: createPlatformPlanBodySchema,
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
            handlers.createPlan,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.listPlans,
        ).not.toHaveBeenCalled();
    });
    it('protège et valide la mise à jour d’un plan avant le controller', async () => {
        const planId =
            '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(
                `/platform/plans/${planId}`,
            )
            .send({
                name: 'Starter Plus',
                isPublic: true,
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
            params: platformPlanIdParamsSchema,
            body: updatePlatformPlanBodySchema,
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
            handlers.updatePlan,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.listPlans,
        ).not.toHaveBeenCalled();

        expect(
            handlers.createPlan,
        ).not.toHaveBeenCalled();
    });

    it('protège et valide l’archivage d’un plan avant le controller', async () => {
        const planId =
            '507f1f77bcf86cd799439011';

        const response = await request(app)
            .patch(
                `/platform/plans/${planId}/archive`,
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
            params: platformPlanIdParamsSchema,
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
            handlers.archivePlan,
        ).toHaveBeenCalledOnce();

        expect(
            handlers.listPlans,
        ).not.toHaveBeenCalled();

        expect(
            handlers.createPlan,
        ).not.toHaveBeenCalled();

        expect(
            handlers.updatePlan,
        ).not.toHaveBeenCalled();
    });
});