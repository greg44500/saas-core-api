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
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';
import {
    platformOverviewQuerySchema,
} from '../../../modules/platform/overview/platformOverview.validation.js';

const {
    permissionMiddleware,
    validationMiddleware,
    getOverviewHandler,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    getOverviewHandler: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
}));

vi.mock(
    '../../../middlewares/authorizePlatformPermission.js',
    () => ({
        authorizePlatformPermission: vi.fn(
            () => permissionMiddleware,
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
    '../../../modules/platform/overview/platformOverview.controller.js',
    () => ({
        getOverview: getOverviewHandler,
    }),
);

import {
    platformOverviewRouter,
} from '../../../modules/platform/overview/platformOverview.routes.js';

const app = express();
app.use('/platform/overview', platformOverviewRouter);

beforeEach(() => {
    /*
     * Les factories de permission et validation sont exécutées lors de
     * l'import du routeur. Leur historique doit donc rester disponible pour
     * vérifier le contrat déclaré par la route.
     */
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    getOverviewHandler.mockClear();
});

describe('platformOverview.routes', () => {
    it('protège le dashboard avec sa permission dédiée et sa query stricte', async () => {
        const response = await request(app)
            .get('/platform/overview?from=2026-08-01T00:00:00.000Z&to=2026-09-01T00:00:00.000Z');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission).toHaveBeenCalledWith(
            PLATFORM_PERMISSION.OVERVIEW_READ,
        );
        expect(validateRequest).toHaveBeenCalledWith({
            query: platformOverviewQuerySchema,
        });
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(getOverviewHandler).toHaveBeenCalledOnce();
    });
});
