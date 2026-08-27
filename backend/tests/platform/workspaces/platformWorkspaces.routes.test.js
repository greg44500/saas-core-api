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
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema,
} from '../../../modules/platform/workspaces/platformWorkspaces.validation.js';
import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';

const {
    platformRoleMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    platformRoleMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
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
    '../../../modules/platform/workspaces/platformWorkspaces.controller.js',
    () => handlers,
);

const app = express();
app.use(express.json());
app.use('/platform', platformRouter);

beforeEach(() => {
    authenticate.mockClear();
    platformRoleMiddleware.mockClear();
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
            validation: { query: paginationQuerySchema },
            handler: handlers.listWorkspaces,
        },
        {
            label: 'détail workspace',
            method: 'get',
            path: '/platform/workspaces/507f1f77bcf86cd799439011',
            validation: { params: platformWorkspaceIdParamsSchema },
            handler: handlers.getWorkspaceById,
        },
        {
            label: 'suspension workspace',
            method: 'patch',
            path: '/platform/workspaces/507f1f77bcf86cd799439011/suspend',
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
            validation: { params: platformWorkspaceIdParamsSchema },
            handler: handlers.reactivateWorkspace,
        },
    ];

    it.each(routeCases)(
        'protège et valide $label avant le controller',
        async ({ method, path, body, validation, handler }) => {
            let pendingRequest = request(app)[method](path);

            if (body) {
                pendingRequest = pendingRequest.send(body);
            }

            const response = await pendingRequest;

            expect(response.status).toBe(200);
            expect(authorizePlatformRole).toHaveBeenCalledWith(
                PLATFORM_ROLE.SUPER_ADMIN,
            );
            expect(validateRequest).toHaveBeenCalledWith(validation);
            expect(authenticate).toHaveBeenCalledOnce();
            expect(platformRoleMiddleware).toHaveBeenCalledOnce();
            expect(validationMiddleware).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledOnce();
        },
    );
});
