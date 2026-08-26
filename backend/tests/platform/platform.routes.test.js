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
    revokeUserSessions,
    updateUserRole,
    listWorkspaces,
    getWorkspaceById,
    suspendWorkspace,
    reactivateWorkspace,
} from '../../modules/platform/platform.controller.js';

import {
    platformRouter,
} from '../../modules/platform/platform.routes.js';

import {
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    platformWorkspaceIdParamsSchema,
    updatePlatformUserRoleBodySchema,
    suspendPlatformWorkspaceBodySchema,
} from '../../modules/platform/platform.validation.js';

import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';


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
        updateUserRole: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        revokeUserSessions: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
            });
        }),
        listWorkspaces: vi.fn(
            (req, res) => {
                res.status(200).json({
                    status: 'success',
                });
            },
        ),
        getWorkspaceById: vi.fn(
            (req, res) => {
                res.status(200).json({
                    status: 'success',
                });
            },
        ),
        suspendWorkspace: vi.fn(
            (req, res) => {
                res.status(200).json({
                    status: 'success',
                });
            },
        ),
        reactivateWorkspace: vi.fn(
            (req, res) => {
                res.status(200).json({
                    status: 'success',
                });
            },
        ),
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
    updateUserRole.mockClear();
    revokeUserSessions.mockClear();
    listWorkspaces.mockClear();
    getWorkspaceById.mockClear();
    suspendWorkspace.mockClear();
    reactivateWorkspace.mockClear();
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
                paginationQuerySchema,
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
    it('protège et valide le changement de rôle plateforme avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .patch(
                '/platform/users/507f1f77bcf86cd799439011/role',
            )
            .send({
                platformRole: PLATFORM_ROLE.ADMIN,
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
            body: updatePlatformUserRoleBodySchema,
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
            updateUserRole,
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
            updateUserRole
                .mock
                .invocationCallOrder[0],
        );
    });
    it('protège et valide la révocation des sessions avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .post(
                '/platform/users/507f1f77bcf86cd799439011/revoke-sessions',
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
            revokeUserSessions,
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
            revokeUserSessions
                .mock
                .invocationCallOrder[0],
        );
    });

    it('protège et valide la liste des workspaces avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .get(
                '/platform/workspaces?page=1&limit=20',
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
            query: paginationQuerySchema,
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
            listWorkspaces,
        ).toHaveBeenCalledOnce();

        /*
         * Une route Platform ne doit jamais atteindre
         * son controller avant les barrières de sécurité
         * et de validation.
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
            listWorkspaces
                .mock
                .invocationCallOrder[0],
        );
    });
    it('protège et valide la suspension d’un workspace avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .patch(
                '/platform/workspaces/507f1f77bcf86cd799439011/suspend',
            )
            .send({
                statusReason:
                    'administrative_review',
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
            params:
                platformWorkspaceIdParamsSchema,
            body:
                suspendPlatformWorkspaceBodySchema,
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
            suspendWorkspace,
        ).toHaveBeenCalledOnce();

        /*
         * La mutation ne doit atteindre le controller qu'après
         * authentification, autorisation Platform et validation.
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
            suspendWorkspace
                .mock
                .invocationCallOrder[0],
        );
    });
    it('protège et valide la réactivation d’un workspace avant d’appeler le controller', async () => {
        const app = express();

        app.use(express.json());

        app.use(
            '/platform',
            platformRouter,
        );

        const response = await request(app)
            .patch(
                '/platform/workspaces/507f1f77bcf86cd799439011/reactivate',
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
            params:
                platformWorkspaceIdParamsSchema,
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
            reactivateWorkspace,
        ).toHaveBeenCalledOnce();

        /*
         * Le controller ne doit être atteint qu'après authentification,
         * autorisation Platform et validation du workspaceId.
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
            reactivateWorkspace
                .mock
                .invocationCallOrder[0],
        );
    });
});