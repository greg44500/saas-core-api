import express from 'express';
import request from 'supertest';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    createAuthorizeApplicationGlobalPermission,
} from '../../middlewares/authorizeApplicationGlobalPermission.js';

const permissionRegistry = Object.freeze({
    permissionKeys: Object.freeze([
        'example-resource:read',
        'example-resource:manage',
    ]),
    reservedPermissionKeys: Object.freeze([]),
});

const buildApp = ({
    authorizationResolver,
    requiredPermission =
        'example-resource:read',
    withUser = true,
}) => {
    const app = express();
    const authorize =
        createAuthorizeApplicationGlobalPermission({
            permissionRegistry,
            authorizationResolver,
        });

    if (withUser) {
        app.use((req, res, next) => {
            req.user = {
                _id: 'user-id',
            };
            next();
        });
    }

    app.get(
        '/protected',
        authorize(requiredPermission),
        (req, res) => {
            res.status(200).json({
                permissions:
                    req.applicationGlobalAuthorization
                        .permissions,
            });
        },
    );

    app.use((error, req, res, next) => {
        void req;
        void next;

        res.status(error.statusCode ?? 500).json({
            message: error.message,
        });
    });

    return app;
};

describe('authorizeApplicationGlobalPermission', () => {
    it('autorise en HTTP quand le resolver persistant expose la permission', async () => {
        const authorizationResolver =
            vi.fn().mockResolvedValue({
                permissions: ['example-resource:read'],
            });
        const app = buildApp({
            authorizationResolver,
        });

        const response = await request(app)
            .get('/protected')
            .expect(200);

        expect(response.body.permissions).toEqual([
            'example-resource:read',
        ]);
        expect(
            authorizationResolver,
        ).toHaveBeenCalledWith({
            user: {
                _id: 'user-id',
            },
            permissionRegistry,
        });
    });

    it('refuse en HTTP lorsque le droit courant a été retiré', async () => {
        const app = buildApp({
            authorizationResolver:
                vi.fn().mockResolvedValue({
                    permissions: [],
                }),
        });

        await request(app)
            .get('/protected')
            .expect(403);
    });

    it('refuse un contexte sans utilisateur authentifié', async () => {
        const app = buildApp({
            authorizationResolver: vi.fn(),
            withUser: false,
        });

        await request(app)
            .get('/protected')
            .expect(403);
    });

    it('refuse de construire une route avec une permission inconnue', () => {
        const authorize =
            createAuthorizeApplicationGlobalPermission({
                permissionRegistry,
                authorizationResolver: vi.fn(),
            });

        expect(() =>
            authorize('unknown-resource:read'),
        ).toThrow(TypeError);
    });
});
