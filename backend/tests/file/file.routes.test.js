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
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { uploadSingleFile } from '../../middlewares/uploadMiddleware.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    download,
    getById,
    list,
    upload,
} from '../../modules/file/file.controller.js';
import { fileRouter } from '../../modules/file/file.routes.js';
import {
    uploadFileBodySchema,
} from '../../modules/file/file.validation.js';
import {
    CORE_PLAN_FEATURE,
} from '../../modules/plan/planCapability.registry.js';
import {
    workspaceIdParamsSchema,
} from '../../modules/workspace/workspace.validation.js';

const {
    executionOrder,
    routeState,
    paramsValidationMiddleware,
    bodyValidationMiddleware,
    permissionMiddleware,
    workspaceAccessMiddleware,
    planFeatureMiddleware,
    multerMiddleware,
    cleanupErrorMiddleware,
} = vi.hoisted(() => {
    const executionOrder = [];
    const routeState = {
        controllerError: null,
        workspaceAccessError: null,
        planFeatureError: null,
    };

    return {
        executionOrder,
        routeState,
        paramsValidationMiddleware: vi.fn((req, res, next) => {
            executionOrder.push('validate-params');
            req.validated = {
                ...(req.validated ?? {}),
                params: req.params,
                query: { page: 1, limit: 20 },
            };
            next();
        }),
        bodyValidationMiddleware: vi.fn((req, res, next) => {
            executionOrder.push('validate-body');
            req.validated = {
                ...(req.validated ?? {}),
                body: { category: 'document' },
            };
            next();
        }),
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
            req.workspaceAccess = { accessMode: 'normal' };
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
    };
});

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        executionOrder.push('authenticate');
        req.user = { _id: 'user-id' };
        next();
    }),
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn((schemas) =>
        schemas.body
            ? bodyValidationMiddleware
            : paramsValidationMiddleware),
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
}));

beforeEach(() => {
    executionOrder.length = 0;
    routeState.controllerError = null;
    routeState.workspaceAccessError = null;
    routeState.planFeatureError = null;
    vi.clearAllMocks();
});

const createTestApp = () => {
    const app = express();
    app.use('/workspaces/:workspaceId/files', fileRouter);
    app.use((error, req, res, next) => {
        res.status(500).json({ message: error.message });
    });
    return app;
};

describe('file.routes', () => {
    it('conserve les barrières upload dans le bon ordre', async () => {
        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(201);
        expect(validateRequest).toHaveBeenCalledWith({
            params: workspaceIdParamsSchema,
        });
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_UPLOAD,
        );
        expect(enforceWorkspaceAccessMode).toHaveBeenCalledWith();
        expect(enforcePlanFeature).toHaveBeenCalledWith(
            CORE_PLAN_FEATURE.FILE_UPLOAD,
        );
        expect(uploadSingleFile).toHaveBeenCalledWith('file');
        expect(validateRequest).toHaveBeenCalledWith({
            body: uploadFileBodySchema,
        });
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

    it('refuse l’upload avant Multer lorsque le workspace est en remédiation', async () => {
        routeState.workspaceAccessError = new Error('Mise en conformité requise');

        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(500);
        expect(planFeatureMiddleware).not.toHaveBeenCalled();
        expect(multerMiddleware).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });

    it('n’appelle pas Multer lorsque le plan refuse file_upload', async () => {
        routeState.planFeatureError = new Error('Fonctionnalité absente du plan');

        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(500);
        expect(multerMiddleware).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });

    it('transmet une erreur du controller upload au nettoyage', async () => {
        routeState.controllerError = new Error('Échec de persistance');

        const response = await request(createTestApp())
            .post('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(500);
        expect(cleanupErrorMiddleware).toHaveBeenCalledOnce();
    });

    it('expose la liste avec file:read sans contrôle de plan ni remédiation', async () => {
        const response = await request(createTestApp())
            .get('/workspaces/507f1f77bcf86cd799439011/files');

        expect(response.status).toBe(200);
        expect(authorizePermission).toHaveBeenCalledWith(
            CORE_PERMISSION.FILE_READ,
        );
        expect(enforceWorkspaceAccessMode).not.toHaveBeenCalled();
        expect(enforcePlanFeature).not.toHaveBeenCalled();
        expect(list).toHaveBeenCalledOnce();
    });

    it('expose le détail et le téléchargement avec file:read', async () => {
        const app = createTestApp();
        const base = '/workspaces/507f1f77bcf86cd799439011/files/507f1f77bcf86cd799439012';

        expect((await request(app).get(base)).status).toBe(200);
        expect((await request(app).get(`${base}/download`)).status).toBe(200);
        expect(getById).toHaveBeenCalledOnce();
        expect(download).toHaveBeenCalledOnce();
    });
});
