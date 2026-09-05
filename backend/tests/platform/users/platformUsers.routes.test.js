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
    closePlatformUserBodySchema,
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
} from '../../../modules/platform/users/platformUsers.validation.js';
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
        closeUser: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        disableUser: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        enableUser: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        getUserById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        listUsers: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        revokeUserSessions: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
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
    '../../../modules/platform/users/platformUsers.controller.js',
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

describe('platformUsers.routes', () => {
    const routeCases = [
        {
            label: 'liste des utilisateurs',
            method: 'get',
            path: '/platform/users?page=1&limit=20',
            permission: PLATFORM_PERMISSION.USERS_READ,
            validation: { query: paginationQuerySchema },
            handler: handlers.listUsers,
        },
        {
            label: 'détail utilisateur',
            method: 'get',
            path: '/platform/users/507f1f77bcf86cd799439011',
            permission: PLATFORM_PERMISSION.USERS_READ,
            validation: { params: platformUserIdParamsSchema },
            handler: handlers.getUserById,
        },
        {
            label: 'désactivation utilisateur',
            method: 'patch',
            path: '/platform/users/507f1f77bcf86cd799439011/disable',
            permission: PLATFORM_PERMISSION.USERS_DISABLE,
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
            permission: PLATFORM_PERMISSION.USERS_ENABLE,
            validation: { params: platformUserIdParamsSchema },
            handler: handlers.enableUser,
        },
        {
            label: 'clôture utilisateur',
            method: 'patch',
            path: '/platform/users/507f1f77bcf86cd799439011/close',
            permission: PLATFORM_PERMISSION.USERS_CLOSE,
            body: { reason: 'Demande de fermeture finalisée' },
            validation: {
                params: platformUserIdParamsSchema,
                body: closePlatformUserBodySchema,
            },
            handler: handlers.closeUser,
        },
        {
            label: 'révocation des sessions',
            method: 'post',
            path: '/platform/users/507f1f77bcf86cd799439011/revoke-sessions',
            permission: PLATFORM_PERMISSION.USERS_REVOKE_SESSIONS,
            validation: { params: platformUserIdParamsSchema },
            handler: handlers.revokeUserSessions,
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

    it('n’expose plus l’ancien endpoint de mutation User.platformRole', async () => {
        const response = await request(app)
            .patch('/platform/users/507f1f77bcf86cd799439011/role')
            .send({ platformRole: 'super_admin' });

        expect(response.status).toBe(404);
    });
});
