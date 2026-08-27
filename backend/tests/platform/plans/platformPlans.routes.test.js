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


const {
    platformRoleMiddleware,
    validationMiddleware,
    listPlans,
} = vi.hoisted(() => ({
    platformRoleMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    listPlans: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
}));


vi.mock(
    '../../../middlewares/authenticate.js',
    () => ({
        authenticate: vi.fn((req, res, next) => {
            req.user = {
                _id: 'user-id',
                id: 'user-id',
                platformRole: PLATFORM_ROLE.SUPER_ADMIN,
            };
            next();
        }),
    }),
);

vi.mock(
    '../../../middlewares/authorizePlatformRole.js',
    () => ({
        authorizePlatformRole: vi.fn(() => platformRoleMiddleware),
    }),
);

vi.mock(
    '../../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn(() => validationMiddleware),
    }),
);

vi.mock(
    '../../../modules/platform/plans/platformPlans.controller.js',
    () => ({ listPlans }),
);


const app = express();
app.use(express.json());
app.use('/platform', platformRouter);


beforeEach(() => {
    authenticate.mockClear();
    authorizePlatformRole.mockClear();
    validateRequest.mockClear();
    platformRoleMiddleware.mockClear();
    validationMiddleware.mockClear();
    listPlans.mockClear();
});


describe('platformPlans.routes', () => {
    it('protège et valide la liste des plans avant le controller', async () => {
        const response = await request(app)
            .get('/platform/plans?page=1&limit=20');

        expect(response.status).toBe(200);
        expect(authorizePlatformRole).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            query: paginationQuerySchema,
        });
        expect(authenticate).toHaveBeenCalledOnce();
        expect(platformRoleMiddleware).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(listPlans).toHaveBeenCalledOnce();
    });
});
