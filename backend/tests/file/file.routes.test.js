import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { uploadSingleFile } from '../../middlewares/uploadMiddleware.js';
import {
    download,
    getById,
    list,
    remove,
    upload,
} from '../../modules/file/file.controller.js';
import { fileRouter } from '../../modules/file/file.routes.js';
import {
    CORE_PLAN_FEATURE,
} from '../../modules/plan/planCapability.registry.js';

const {
    executionOrder,
    routeState,
    permissionMiddleware,
    workspaceAccessMiddleware,
    planFeatureMiddleware,
    multerMiddleware,
    cleanupErrorMiddleware,
} = vi.hoisted(() => ({
    executionOrder: [],
    routeState: {
        controllerError: null,
        workspaceAccessError: null,
        planFeatureError: null,
    },
    permissionMiddleware: vi.fn((req, res, next) => {
        executionOrder.push('authorize');
        next();
    }),
    workspaceAccessMiddleware: vi.fn((req, res, next) => {
        executionOrder.push('workspace-access');
        if (routeState.workspaceAccessError) {
            next(routeState.workspaceAccessError);
            return;
        }
        next();
    }),
    planFeatureMiddleware: vi.fn((req, res, next) => {
        executionOrder.push('plan-feature');
        if (routeState.planFeatureError) {
            next(routeState.planFeatureError);
            return;
        }
        next();
    }),
    multerMiddleware: vi.fn((req, res, next) => {
        executionOrder.push('multer');
        req.file = { path: '/temporary/upload' };
        next();
    }),
    cleanupErrorMiddleware: vi.fn((error, req, res, next) => {
        executionOrder.push('cleanup');
        next(error);
    }),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        executionOrder.push('authenticate');
        req.user = { _id: 'user-id' };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn((schemas) => (req, res, next) => {
        executionOrder.push(schemas.body ? 'validate-body' : 'validate-params');
        req.validated = {
            ...(req.validated ?? {}),
            params: req.params,
            query: { page: 1, limit: 20 },
            ...(schemas.body ? { body: { category: 'document' } } : {}),
        };
        next();
    }),
}));

vi.mock('../../middlewares/loadWorkspaceContext.js', () => ({
    loadWorkspaceContext: vi.fn((req, res, next) => {
        executionOrder.push('workspace-context');
        req.workspace = { _id: req.params.workspaceId };
        next();
    }),
}));

vi.mock('../../middlewares/authorizePermission.js', () => ({
    authorizePermission: vi.fn(() => permissionMiddleware),
}));

vi.mock('../../middlewares/enforceWorkspaceAccessMode.js', () => ({
    enforceWorkspaceAccessMode: vi.fn(() => workspaceAccessMiddleware),
}));

vi.mock('../../middlewares/enforcePlanFeature.js', () => ({
    enforcePlanFeature: vi.fn(() => planFeatureMiddleware),
}));

vi.mock('../../middlewares/uploadMiddleware.js', () => ({
    uploadSingleFile: vi.fn(() => multerMiddleware),
}));

vi.mock('../../middlewares/cleanupTemporaryUploadOnError.js', () => ({
    cleanupTemporaryUploadOnError: cleanupErrorMiddleware,
}));

vi.mock('../../modules/file/file.controller.js', () => ({
    upload: vi.fn((req, res, next) => {
        executionOrder.push('controller');
        if (routeState.controllerError) {
            next(routeState.controllerError);
            return;
        }
        res.status(201).json({ status: 'success' });
    }),
    list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    getById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    download: vi.fn((req, res) => res.status(200).end()),
    remove: vi.fn((req, res) => res.status(204).send()),
}));

const createTestApp = () => {
    const app = express();
    app.use('/workspaces/:workspaceId/files', fileRouter);
    app.use((error, req, res, next) => {
        res.status(500).json({ message: error.message });
    });
    return app;
};

beforeEach(() => {
    executionOrder.length = 0;
    routeState.controllerError = null;
    routeState.workspaceAccessError = null;
    routeState.planFeatureError = null;

    permissionMiddleware.mockClear();
    workspaceAccessMiddleware.mockClear();
    planFeatureMiddleware.mockClear();
    multerMiddleware.mockClear();
    cleanupErrorMiddleware.mockClear();
    upload.mockClear();
    list.mockClear();
    getById.mockClear();
    download.mockClear();
    remove.mockClear();
});

describe('file.routes', () => {
    it('conserve la chaîne de protection de l’upload', async () => {
        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(201);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_UPLOAD,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith();
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.FILE_UPLOAD,
        );
        expect(uploadSingleFile).toHaveBeenCalledWith('file');
        expect(executionOrder).toEqual([
            'authenticate',
            'validate-params',
            'workspace-context',
            'authorize',
            'workspace-access',
            'plan-feature',
            'multer',
            'validate-body',
            'controller',
        ]);
    });

    it('refuse l’upload avant Multer en remédiation', async () => {
        routeState.workspaceAccessError = new Error('remediation');

        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(500);
        expect(multerMiddleware).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuse l’upload avant Multer lorsque le plan bloque la feature', async () => {
        routeState.planFeatureError = new Error('feature blocked');

        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(500);
        expect(multerMiddleware).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });

    it('laisse les lectures accessibles sans contrôle de plan ni remédiation', async () => {
        const app = createTestApp();
        const workspace = '507f1f77bcf86cd799439011';
        const file = '507f1f77bcf86cd799439012';

        expect((await request(app).get(`/workspaces/${workspace}/files`)).status)
            .toBe(200);
        expect((await request(app).get(`/workspaces/${workspace}/files/${file}`)).status)
            .toBe(200);
        expect((await request(app).get(`/workspaces/${workspace}/files/${file}/download`)).status)
            .toBe(200);

        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_READ,
        );
        expect(list).toHaveBeenCalledOnce();
        expect(getById).toHaveBeenCalledOnce();
        expect(download).toHaveBeenCalledOnce();
    });

    it('autorise la suppression comme action corrective en remédiation', async () => {
        const workspace = '507f1f77bcf86cd799439011';
        const file = '507f1f77bcf86cd799439012';

        const response = await request(createTestApp())
            .delete(`/workspaces/${workspace}/files/${file}`);

        expect(response.status).toBe(204);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_DELETE,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith({
            allowDuringRemediation: true,
        });
        expect(remove).toHaveBeenCalledOnce();
        expect(planFeatureMiddleware).not.toHaveBeenCalled();
        expect(multerMiddleware).not.toHaveBeenCalled();
    });
});
