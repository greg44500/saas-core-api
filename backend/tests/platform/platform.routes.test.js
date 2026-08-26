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
} from '../../constants/platformRoles.constants.js';

import {
    authenticate,
} from '../../middlewares/authenticate.js';

import {
    authorizePlatformRole,
} from '../../middlewares/authorizePlatformRole.js';

import {
    validateRequest,
} from '../../middlewares/validateRequest.js';

import {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
} from '../../modules/platform/platform.controller.js';

import {
    platformRouter,
} from '../../modules/platform/platform.routes.js';

import {
    disablePlatformUserBodySchema,
    listPlatformUsersQuerySchema,
    platformUserIdParamsSchema,
} from '../../modules/platform/platform.validation.js';


const {
    platformRoleMiddleware,
    validationMiddleware,
} = vi.hoisted(() => ({
    platformRoleMiddleware: vi.fn(
        (req, res, next) => {
            next();
        },
    ),

    validationMiddleware: vi.fn(
        (req, res, next) => {
            req.validated = {
                query: {
                    page: 1,
                    limit: 20,
                },
            };

            next();
        },
    ),
}));


vi.mock(
    '../../middlewares/authenticate.js',
    () => ({
        authenticate: vi.fn(
            (req, res, next) => {
                req.user = {
                    id: 'user-id',
                    platformRole:
                        'super_admin',
                };

                next();
            },
        ),
    }),
);


vi.mock(
    '../../middlewares/authorizePlatformRole.js',
    () => ({
        authorizePlatformRole: vi.fn(
            () => platformRoleMiddleware,
        ),
    }),
);


vi.mock(
    '../../middlewares/validateRequest.js',
    () => ({
        validateRequest: vi.fn(
            () => validationMiddleware,
        ),
    }),
);


vi.mock(
    '../../modules/platform/platform.controller.js',
    () => ({
        listUsers: vi.fn(
            (req, res) => {
                res.status(200).json({
                    status: 'success',
                });
            },
        ),
        getUserById: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        disableUser: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        enableUser: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
    }),
);


beforeEach(() => {
    authenticate.mockClear();
    platformRoleMiddleware.mockClear();
    validationMiddleware.mockClear();
    listUsers.mockClear();
    getUserById.mockClear();
    disableUser.mockClear();
    enableUser.mockClear();
});


describe('platform.routes', () => {
    it('protège et valide la liste des utilisateurs avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .get(
                '/platform/users?page=1&limit=20',
            );

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            query:
                listPlatformUsersQuerySchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            listUsers,
        ).toHaveBeenCalledOnce();

        /*
         * L'ordre constitue ici le contrat principal :
         * aucune donnée Platform ne doit atteindre le controller
         * avant authentification, autorisation et validation.
         */
        expect(
            authenticate
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            listUsers
                .mock
                .invocationCallOrder[0],
        );
    });
    it('protège et valide l’accès au détail d’un utilisateur avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .get(
                '/platform/users/507f1f77bcf86cd799439011',
            );

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params: platformUserIdParamsSchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            getUserById,
        ).toHaveBeenCalledOnce();

        expect(
            authenticate
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            getUserById
                .mock
                .invocationCallOrder[0],
        );
    });
    it('protège et valide la désactivation d’un utilisateur avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .patch(
                '/platform/users/507f1f77bcf86cd799439011/disable',
            )
            .send({
                disabledReason:
                    'Violation des conditions d’utilisation',
            });

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params: platformUserIdParamsSchema,
            body: disablePlatformUserBodySchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            disableUser,
        ).toHaveBeenCalledOnce();

        expect(
            authenticate
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            disableUser
                .mock
                .invocationCallOrder[0],
        );
    });
    it('protège et valide la réactivation d’un utilisateur avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .patch(
                '/platform/users/507f1f77bcf86cd799439011/enable',
            );

        expect(response.status).toBe(200);

        expect(
            authorizePlatformRole,
        ).toHaveBeenCalledWith(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        expect(
            validateRequest,
        ).toHaveBeenCalledWith({
            params: platformUserIdParamsSchema,
        });

        expect(
            authenticate,
        ).toHaveBeenCalledOnce();

        expect(
            platformRoleMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            validationMiddleware,
        ).toHaveBeenCalledOnce();

        expect(
            enableUser,
        ).toHaveBeenCalledOnce();

        expect(
            authenticate
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            platformRoleMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        );

        expect(
            validationMiddleware
                .mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            enableUser
                .mock
                .invocationCallOrder[0],
        );
    });
});