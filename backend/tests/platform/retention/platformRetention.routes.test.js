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
import { authenticate } from '../../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../../middlewares/validateRequest.js';
import { platformRouter } from '../../../modules/platform/platform.routes.js';
import {
    createRetentionPolicyVersionBodySchema,
    executeRetentionPolicyBodySchema,
    platformRetentionTargetParamsSchema,
} from '../../../modules/platform/retention/platformRetention.validation.js';
import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';

const {
    createRetentionPolicyVersion,
    executeRetentionManually,
    getRetentionState,
    listRetentionExecutions,
    listRetentionTargets,
    permissionMiddleware,
    previewRetention,
    validationMiddleware,
} = vi.hoisted(() => ({
    createRetentionPolicyVersion: vi.fn((req, res) =>
        res.status(201).json({ status: 'success' })),
    executeRetentionManually: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
    getRetentionState: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
    listRetentionExecutions: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
    listRetentionTargets: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    previewRetention: vi.fn((req, res) =>
        res.status(200).json({ status: 'success' })),
    validationMiddleware: vi.fn((req, res, next) => next()),
}));

vi.mock('../../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            _id: 'user-id',
            id: 'user-id',
        };
        next();
    }),
}));

vi.mock(
    '../../../middlewares/authorizePlatformPermission.js',
    () => ({
        authorizePlatformPermission: vi.fn(() => permissionMiddleware),
    }),
);

vi.mock('../../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock(
    '../../../modules/platform/retention/platformRetention.controller.js',
    () => ({
        createRetentionPolicyVersion,
        executeRetentionManually,
        getRetentionState,
        listRetentionExecutions,
        listRetentionTargets,
        previewRetention,
    }),
);

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

beforeEach(() => {
    authenticate.mockClear();
    authorizePlatformPermission.mockClear();
    validateRequest.mockClear();
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    createRetentionPolicyVersion.mockClear();
    executeRetentionManually.mockClear();
    getRetentionState.mockClear();
    listRetentionExecutions.mockClear();
    listRetentionTargets.mockClear();
    previewRetention.mockClear();
});


describe('platformRetention.routes', () => {
    it('sépare strictement read, preview, update et execute', async () => {
        await request(app).get('/platform/retention');
        await request(app).get('/platform/retention/audit_log');
        await request(app).get(
            '/platform/retention/audit_log/executions?page=1&limit=20',
        );
        await request(app).post(
            '/platform/retention/audit_log/preview',
        );
        await request(app).post(
            '/platform/retention/audit_log/policy-versions',
        );
        await request(app).post(
            '/platform/retention/audit_log/executions',
        );

        expect(authorizePlatformPermission.mock.calls)
            .toEqual(expect.arrayContaining([
                [PLATFORM_PERMISSION.RETENTION_READ],
                [PLATFORM_PERMISSION.RETENTION_PREVIEW],
                [PLATFORM_PERMISSION.RETENTION_UPDATE],
                [PLATFORM_PERMISSION.RETENTION_EXECUTE],
            ]));
    });

    it('branche les schémas stricts avant les contrôleurs sensibles', async () => {
        await request(app).get(
            '/platform/retention/audit_log/executions?page=1&limit=20',
        );
        await request(app).post(
            '/platform/retention/audit_log/policy-versions',
        );
        await request(app).post(
            '/platform/retention/audit_log/executions',
        );

        expect(validateRequest.mock.calls)
            .toEqual(expect.arrayContaining([
                [{
                    params: platformRetentionTargetParamsSchema,
                    query: paginationQuerySchema,
                }],
                [{
                    params: platformRetentionTargetParamsSchema,
                    body: createRetentionPolicyVersionBodySchema,
                }],
                [{
                    params: platformRetentionTargetParamsSchema,
                    body: executeRetentionPolicyBodySchema,
                }],
            ]));
    });

    it('n’expose aucune route DELETE générique de rétention', async () => {
        const response = await request(app)
            .delete('/platform/retention/audit_log');

        expect(response.status).toBe(404);
    });
});
