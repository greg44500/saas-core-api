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
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    updatePlatformUserRoleBodySchema,
} from '../../../modules/platform/users/platformUsers.validation.js';
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
        disableUser: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        enableUser: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        getUserById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        listUsers: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        revokeUserSessions: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        updateUserRole: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
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
    '../../../modules/platform/users/platformUsers.controller.js',
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

describe('platformUsers.routes', () => {
    const routeCases = [
        {
            label: 'liste des utilisateurs',
            method: 'get',
            path: '/platform/users?page=1&limit=20',
            validation: { query: paginationQuerySchema },
            handler: handlers.listUsers,
        },
        {
            label: 'détail utilisateur',
            method: 'get',
            path: '/platform/users/507f1f77bcf86cd799439011',
            validation: { params: platformUserIdParamsSchema },
            handler: handlers.getUserById,
        },
        {
            label: 'désactivation utilisateur',
            method: 'patch',
            path: '/platform/users/507f1f77bcf86cd799439011/disable',
            body: { disabledReason: 'Violation des conditions' },
            validation: {
                params: platformUserIdParamsSchema,
                body: disablePlatformUserBodySchema,
            },
            handler: handlers.disableUser,
        },
        {
            label: 'réactivation utilisateur',
            method: 'patch',
            path: '/platform/users/507f1f77bcf86cd799439011/enable',
            validation: { params: platformUserIdParamsSchema },
            handler: handlers.enableUser,
        },
        {
            label: 'révocation des sessions',
            method: 'post',
            path: '/platform/users/507f1f77bcf86cd799439011/revoke-sessions',
            validation: { params: platformUserIdParamsSchema },
            handler: handlers.revokeUserSessions,
        },
        {
            label: 'changement de rôle plateforme',
            method: 'patch',
            path: '/platform/users/507f1f77bcf86cd799439011/role',
            body: { platformRole: PLATFORM_ROLE.ADMIN },
            validation: {
                params: platformUserIdParamsSchema,
                body: updatePlatformUserRoleBodySchema,
            },
            handler: handlers.updateUserRole,
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
