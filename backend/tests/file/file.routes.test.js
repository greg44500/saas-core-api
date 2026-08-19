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
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';

import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';

import {
    enforcePlanFeature,
} from '../../middlewares/enforcePlanFeature.js';

import {
    uploadSingleFile,
} from '../../middlewares/uploadMiddleware.js';

import {
    validateRequest,
} from '../../middlewares/validateRequest.js';

import {
    upload,
} from '../../modules/file/file.controller.js';

import {
    fileRouter,
} from '../../modules/file/file.routes.js';

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
    planFeatureMiddleware,
    multerMiddleware,
    cleanupErrorMiddleware,
} = vi.hoisted(() => {
    const executionOrder = [];

    const routeState = {
        controllerError: null,
        planFeatureError: null,
    };

    return {
        executionOrder,
        routeState,

        paramsValidationMiddleware:
            vi.fn((request, response, next) => {
                executionOrder.push('validate-params');
                next();
            }),

        bodyValidationMiddleware:
            vi.fn((request, response, next) => {
                executionOrder.push('validate-body');

                request.validated = {
                    body: {
                        category: 'document',
                    },
                };

                next();
            }),

        permissionMiddleware:
            vi.fn((request, response, next) => {
                executionOrder.push('authorize');
                next();
            }),

        planFeatureMiddleware:
            vi.fn((request, response, next) => {
                executionOrder.push('plan-feature');

                if (routeState.planFeatureError) {
                    next(
                        routeState.planFeatureError,
                    );
                    return;
                }

                request.planEntitlement = {
                    subscription: {
                        _id: 'subscription-id',
                    },
                    plan: {
                        _id: 'plan-id',
                        features: [
                            'file_upload',
                        ],
                    },
                };

                next();
            }),

        multerMiddleware:
            vi.fn((request, response, next) => {
                executionOrder.push('multer');

                request.file = {
                    path: '/temporary/upload',
                };

                next();
            }),

        cleanupErrorMiddleware:
            vi.fn(function cleanupErrorMiddleware(
                error,
                request,
                response,
                next,
            ) {
                executionOrder.push('cleanup');
                next(error);
            }),
    };
});


vi.mock(
    '../../middlewares/authenticate.js',
    () => ({
        authenticate:
            vi.fn((request, response, next) => {
                executionOrder.push(
                    'authenticate',
                );

                request.user = {
                    _id: 'user-id',
                };

                next();
            }),
    }),
);


vi.mock(
    '../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn((schemas) => {
            if (schemas.params) {
                return paramsValidationMiddleware;
            }

            return bodyValidationMiddleware;
        }),
    }),
);


vi.mock(
    '../../middlewares/loadWorkspaceContext.js',
    () => ({
        loadWorkspaceContext:
            vi.fn((request, response, next) => {
                executionOrder.push(
                    'workspace-context',
                );

                request.workspace = {
                    _id:
                        request.params.workspaceId,
                };

                request.permissions = [
                    CORE_PERMISSION.FILE_UPLOAD,
                ];

                next();
            }),
    }),
);


vi.mock(
    '../../middlewares/authorizePermission.js',
    () => ({
        authorizePermission:
            vi.fn(() => permissionMiddleware),
    }),
);


vi.mock(
    '../../middlewares/enforcePlanFeature.js',
    () => ({
        enforcePlanFeature:
            vi.fn(() => planFeatureMiddleware),
    }),
);


vi.mock(
    '../../middlewares/uploadMiddleware.js',
    () => ({
        uploadSingleFile:
            vi.fn(() => multerMiddleware),
    }),
);


vi.mock(
    '../../middlewares/cleanupTemporaryUploadOnError.js',
    () => ({
        cleanupTemporaryUploadOnError:
            cleanupErrorMiddleware,
    }),
);


vi.mock(
    '../../modules/file/file.controller.js',
    () => ({
        upload:
            vi.fn((request, response, next) => {
                executionOrder.push(
                    'controller',
                );

                if (
                    routeState.controllerError
                ) {
                    next(
                        routeState.controllerError,
                    );
                    return;
                }

                response.status(201).json({
                    status: 'success',
                });
            }),
    }),
);


beforeEach(() => {
    executionOrder.length = 0;
    routeState.controllerError = null;
    routeState.planFeatureError = null;

    paramsValidationMiddleware.mockClear();
    bodyValidationMiddleware.mockClear();
    permissionMiddleware.mockClear();
    planFeatureMiddleware.mockClear();
    multerMiddleware.mockClear();
    cleanupErrorMiddleware.mockClear();

    upload.mockClear();
});


const createTestApp = () => {
    const app = express();

    app.use(
        '/workspaces/:workspaceId/files',
        fileRouter,
    );

    app.use(
        (error, request, response, next) => {
            response.status(500).json({
                message: error.message,
            });
        },
    );

    return app;
};


describe('file.routes', () => {
    it('applique les barrières dans l’ordre avant le controller', async () => {
        const app = createTestApp();

        const response = await request(app)
            .post(
                '/workspaces/507f1f77bcf86cd799439011/files',
            );

        expect(response.status).toBe(201);

        expect(validateRequest)
            .toHaveBeenNthCalledWith(1, {
                params:
                    workspaceIdParamsSchema,
            });

        expect(authorizePermission)
            .toHaveBeenCalledWith(
                CORE_PERMISSION.FILE_UPLOAD,
            );

        expect(enforcePlanFeature)
            .toHaveBeenCalledWith(
                CORE_PLAN_FEATURE.FILE_UPLOAD,
            );

        expect(uploadSingleFile)
            .toHaveBeenCalledWith('file');

        expect(validateRequest)
            .toHaveBeenNthCalledWith(2, {
                body: uploadFileBodySchema,
            });

        expect(executionOrder).toEqual([
            'authenticate',
            'validate-params',
            'workspace-context',
            'authorize',
            'plan-feature',
            'multer',
            'validate-body',
            'controller',
        ]);

        expect(cleanupErrorMiddleware)
            .not.toHaveBeenCalled();
    });


    it('n’appelle pas Multer lorsque le plan refuse la fonctionnalité', async () => {
        const app = createTestApp();

        routeState.planFeatureError =
            new Error(
                'Fonctionnalité absente du plan',
            );

        const response = await request(app)
            .post(
                '/workspaces/507f1f77bcf86cd799439011/files',
            );

        expect(response.status).toBe(500);

        expect(response.body).toEqual({
            message:
                'Fonctionnalité absente du plan',
        });

        expect(executionOrder).toEqual([
            'authenticate',
            'validate-params',
            'workspace-context',
            'authorize',
            'plan-feature',
            'cleanup',
        ]);

        /*
         * Cette assertion démontre qu'aucun flux binaire ne peut être écrit
         * en quarantaine lorsque le plan n'autorise pas la fonctionnalité.
         */
        expect(multerMiddleware)
            .not.toHaveBeenCalled();

        expect(bodyValidationMiddleware)
            .not.toHaveBeenCalled();

        expect(upload)
            .not.toHaveBeenCalled();

        /*
         * Le middleware d'erreur traverse tout de même la requête. Il ne
         * trouvera aucun req.file et transmettra simplement l'erreur.
         */
        expect(cleanupErrorMiddleware)
            .toHaveBeenCalledOnce();
    });


    it('transmet une erreur du controller au nettoyage de l’upload', async () => {
        const app = createTestApp();

        routeState.controllerError =
            new Error(
                'Échec de persistance',
            );

        const response = await request(app)
            .post(
                '/workspaces/507f1f77bcf86cd799439011/files',
            );

        expect(response.status).toBe(500);

        expect(response.body).toEqual({
            message:
                'Échec de persistance',
        });

        expect(executionOrder).toEqual([
            'authenticate',
            'validate-params',
            'workspace-context',
            'authorize',
            'plan-feature',
            'multer',
            'validate-body',
            'controller',
            'cleanup',
        ]);

        expect(cleanupErrorMiddleware)
            .toHaveBeenCalledOnce();
    });
});