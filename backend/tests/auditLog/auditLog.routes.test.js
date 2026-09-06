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
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    getWorkspaceAuditLogMetadata,
    listWorkspaceAuditLogEntries,
} from '../../modules/auditLog/auditLog.controller.js';
import {
    auditLogRouter,
} from '../../modules/auditLog/auditLog.routes.js';
import {
    workspaceAuditLogQuerySchema,
} from '../../modules/auditLog/auditLog.validation.js';
import {
    CORE_PLAN_FEATURE,
} from '../../modules/plan/planCapability.registry.js';
import {
    workspaceIdParamsSchema,
} from '../../modules/workspace/workspace.validation.js';

const {
    validationMiddleware,
    workspaceContextMiddleware,
    permissionMiddleware,
    featureMiddleware,
} = vi.hoisted(() => ({
    validationMiddleware: vi.fn((req, res, next) => next()),
    workspaceContextMiddleware: vi.fn((req, res, next) => {
        req.workspace = { _id: 'workspace-id' };
        req.permissions = ['audit:read'];
        next();
    }),
    permissionMiddleware: vi.fn((req, res, next) => next()),
    featureMiddleware: vi.fn((req, res, next) => next()),
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

vi.mock('../../middlewares/enforcePlanFeature.js', () => ({
    enforcePlanFeature: vi.fn(() => featureMiddleware),
}));

vi.mock(
    '../../modules/auditLog/auditLog.controller.js',
    () => ({
        getWorkspaceAuditLogMetadata: vi.fn((req, res) => {
            res.status(200).json({ status: 'success' });
        }),
        listWorkspaceAuditLogEntries: vi.fn((req, res) => {
            res.status(200).json({ status: 'success' });
        }),
    }),
);

beforeEach(() => {
    authenticate.mockClear();
    validationMiddleware.mockClear();
    workspaceContextMiddleware.mockClear();
    permissionMiddleware.mockClear();
    featureMiddleware.mockClear();
    getWorkspaceAuditLogMetadata.mockClear();
    listWorkspaceAuditLogEntries.mockClear();
});

const createApp = () => {
    const app = express();
    app.use(
        '/workspaces/:workspaceId/audit-logs',
        auditLogRouter,
    );
    return app;
};

describe('auditLog.routes', () => {
    it('protège les métadonnées workspace avec audit:read et audit_logs', async () => {
        const response = await request(createApp())
            .get('/workspaces/507f1f77bcf86cd799439011/audit-logs/metadata');

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.AUDIT_READ,
        );
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.AUDIT_LOGS,
        );
        expect(workspaceContextMiddleware).toHaveBeenCalledOnce();
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(featureMiddleware).toHaveBeenCalledOnce();
        expect(getWorkspaceAuditLogMetadata).toHaveBeenCalledOnce();
        expect(listWorkspaceAuditLogEntries).not.toHaveBeenCalled();
    });

    it('protège la lecture workspace avec audit:read et audit_logs', async () => {
        const response = await request(createApp())
            .get('/workspaces/507f1f77bcf86cd799439011/audit-logs');

        expect(response.status).toBe(200);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
            query: workspaceAuditLogQuerySchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.AUDIT_READ,
        );
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.AUDIT_LOGS,
        );
        expect(workspaceContextMiddleware).toHaveBeenCalledOnce();
        expect(permissionMiddleware).toHaveBeenCalledOnce();
        expect(featureMiddleware).toHaveBeenCalledOnce();
        expect(listWorkspaceAuditLogEntries).toHaveBeenCalledOnce();
        expect(
            workspaceContextMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            permissionMiddleware.mock.invocationCallOrder[0],
        );
        expect(
            permissionMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            featureMiddleware.mock.invocationCallOrder[0],
        );
        expect(
            featureMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            listWorkspaceAuditLogEntries.mock.invocationCallOrder[0],
        );
    });
});
