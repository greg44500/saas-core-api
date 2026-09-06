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
} from '../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { platformRoleRouter } from '../../modules/platformRole/platformRole.routes.js';
import {
    createPlatformRoleBodySchema,
    listPlatformRolesQuerySchema,
    platformRoleIdParamsSchema,
    updatePlatformRoleBodySchema,
} from '../../modules/platformRole/platformRole.validation.js';

const {
    permissionMiddleware,
    validationMiddleware,
    handlers,
} = vi.hoisted(() => ({
    permissionMiddleware: vi.fn((req, res, next) => next()),
    validationMiddleware: vi.fn((req, res, next) => next()),
    handlers: {
        list: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        getById: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        listPermissions: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        create: vi.fn((req, res) => res.status(201).json({ status: 'success' })),
        update: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
        archive: vi.fn((req, res) => res.status(200).json({ status: 'success' })),
    },
}));

vi.mock('../../middlewares/authorizePlatformPermission.js', () => ({
    authorizePlatformPermission: vi.fn(() => permissionMiddleware),
}));
vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));
vi.mock('../../modules/platformRole/platformRole.controller.js', () => handlers);

const app = express();
app.use(express.json());
app.use('/roles', platformRoleRouter);

beforeEach(() => {
    permissionMiddleware.mockClear();
    validationMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});


describe('platformRoleRouter', () => {
    it('protège la liste et le catalogue avec roles:read', async () => {
        expect((await request(app).get('/roles?page=1&limit=20')).status).toBe(200);
        expect((await request(app).get('/roles/permissions')).status).toBe(200);

        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.ROLES_READ,
        ]);
        expect(validateRequest.mock.calls).toContainEqual([{
            query: listPlatformRolesQuerySchema,
        }]);
        expect(handlers.list).toHaveBeenCalledOnce();
        expect(handlers.listPermissions).toHaveBeenCalledOnce();
    });

    it('valide la lecture d’un rôle avec son ObjectId', async () => {
        const roleId = '507f1f77bcf86cd799439011';
        const response = await request(app).get(`/roles/${roleId}`);

        expect(response.status).toBe(200);
        expect(validateRequest.mock.calls).toContainEqual([{
            params: platformRoleIdParamsSchema,
        }]);
        expect(handlers.getById).toHaveBeenCalledOnce();
    });

    it('protège la création avec roles:create et le schéma Zod strict', async () => {
        const response = await request(app)
            .post('/roles')
            .send({
                name: 'Support catalogue',
                permissions: [],
            });

        expect(response.status).toBe(201);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.ROLES_CREATE,
        ]);
        expect(validateRequest.mock.calls).toContainEqual([{
            body: createPlatformRoleBodySchema,
        }]);
        expect(handlers.create).toHaveBeenCalledOnce();
    });

    it('sépare les permissions de modification et d’archivage', async () => {
        const roleId = '507f1f77bcf86cd799439011';

        expect((await request(app)
            .patch(`/roles/${roleId}`)
            .send({ name: 'Responsable catalogue' })).status).toBe(200);
        expect((await request(app)
            .patch(`/roles/${roleId}/archive`)).status).toBe(200);

        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.ROLES_UPDATE,
        ]);
        expect(authorizePlatformPermission.mock.calls).toContainEqual([
            PLATFORM_PERMISSION.ROLES_ARCHIVE,
        ]);
        expect(validateRequest.mock.calls).toContainEqual([{
            params: platformRoleIdParamsSchema,
            body: updatePlatformRoleBodySchema,
        }]);
        expect(validateRequest.mock.calls).toContainEqual([{
            params: platformRoleIdParamsSchema,
        }]);
        expect(handlers.update).toHaveBeenCalledOnce();
        expect(handlers.archive).toHaveBeenCalledOnce();
    });
});
