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
    platformAuditLogQuerySchema,
} from '../../../modules/platform/auditLogs/platformAuditLogs.validation.js';


const {
    permissionMiddleware,
    validationMiddleware,
    listAuditLogs,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    listAuditLogs: vi.fn((req, res) => res.status(200).json({
        status: 'success',
    })),
}));

vi.mock(
    '../../../middlewares/authenticate.js',
    () => ({
        authenticate: vi.fn((req, res, next) => {
            req.user = {
                _id: 'user-id',
                id: 'user-id',
            };
            next();
        }),
    }),
);

vi.mock(
    '../../../middlewares/authorizePlatformPermission.js',
    () => ({
        authorizePlatformPermission: vi.fn(() => permissionMiddleware),
    }),
);

vi.mock(
    '../../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn(() => validationMiddleware),
    }),
);

vi.mock(
    '../../../modules/platform/auditLogs/platformAuditLogs.controller.js',
    () => ({
        listAuditLogs,
    }),
);

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

beforeEach(() => {
    authenticate.mockClear();
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    listAuditLogs.mockClear();
});


describe('platformAuditLogs.routes', () => {
    it('protège et valide la lecture globale avant le controller', async () => {
        const response = await request(app)
            .get('/platform/audit-logs?page=1&limit=20');

        expect(response.status).toBe(200);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.AUDIT_LOGS_READ,
        ]);
        expect(validateRequest.mock.calls).toContainEqual([{
            query: platformAuditLogQuerySchema,
        }]);
        expect(authenticate).toHaveBeenCalledOnce();
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(listAuditLogs).toHaveBeenCalledOnce();
    });
});
