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
    closePlatformWorkspaceBodySchema,
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema,
} from '../../../modules/platform/workspaces/platformWorkspaces.validation.js';
import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';

const {
    permissionMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
        closeWorkspace: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        getWorkspaceById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        listWorkspaces: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        reactivateWorkspace: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        suspendWorkspace: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    },
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
    '../../../modules/platform/workspaces/platformWorkspaces.controller.js',
    () => handlers,
);

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

beforeEach(() => {
    authenticate.mockClear();
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();

    Object.values(handlers).forEach((handler) => {
        handler.mockClear();
    });
});

describe('platformWorkspaces.routes', () => {
    const routeCases = [
        {
            label: 'liste des workspaces',
            method: 'get',
            path: '/platform/workspaces?page=1&limit=20',
            permission: PLATFORM_PERMISSION.WORKSPACES_READ,
            validation: { query: paginationQuerySchema },
            handler: handlers.listWorkspaces,
        },
        {
            label: 'détail workspace',
            method: 'get',
            path: '/platform/workspaces/507f1f77bcf86cd799439011',
            permission: PLATFORM_PERMISSION.WORKSPACES_READ,
            validation: { params: platformWorkspaceIdParamsSchema },
            handler: handlers.getWorkspaceById,
        },
        {
            label: 'suspension workspace',
            method: 'patch',
            path: '/platform/workspaces/507f1f77bcf86cd799439011/suspend',
            permission: PLATFORM_PERMISSION.WORKSPACES_SUSPEND,
            body: { statusReason: 'administrative_review' },
            validation: {
                params: platformWorkspaceIdParamsSchema,
                body: suspendPlatformWorkspaceBodySchema,
            },
            handler: handlers.suspendWorkspace,
        },
        {
            label: 'réactivation workspace',
            method: 'patch',
            path: '/platform/workspaces/507f1f77bcf86cd799439011/reactivate',
            permission: PLATFORM_PERMISSION.WORKSPACES_REACTIVATE,
            validation: { params: platformWorkspaceIdParamsSchema },
            handler: handlers.reactivateWorkspace,
        },
        {
            label: 'clôture workspace',
            method: 'patch',
            path: '/platform/workspaces/507f1f77bcf86cd799439011/close',
            permission: PLATFORM_PERMISSION.WORKSPACES_CLOSE,
            body: { statusReason: 'platform_decision' },
            validation: {
                params: platformWorkspaceIdParamsSchema,
                body: closePlatformWorkspaceBodySchema,
            },
            handler: handlers.closeWorkspace,
        },
    ];

    it.each(routeCases)(
        'protège et valide $label avant le controller',
        async ({ method, path, body, permission, validation, handler }) => {
            let pendingRequest = request(app)[method](path);

            if (body) {
                pendingRequest = pendingRequest.send(body);
            }

            const response = await pendingRequest;

            expect(response.status).toBe(200);
            expect(authorizePlatformPermission.mock.calls).toContainEqual([
                permission,
            ]);
            expect(validateRequest.mock.calls).toContainEqual([validation]);
            expect(authenticate).toHaveBeenCalledOnce();
            expect(permissionMiddleware).toHaveBeenCalledOnce();
            expect(validationMiddleware).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledOnce();
        },
    );
});
