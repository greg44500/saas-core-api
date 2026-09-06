import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const services = vi.hoisted(() => ({
    listPlatformRoles: vi.fn(),
    getPlatformRoleById: vi.fn(),
    createCustomPlatformRole: vi.fn(),
    updateCustomPlatformRole: vi.fn(),
    archiveCustomPlatformRole: vi.fn(),
    getPlatformRolePermissionCatalogForActor: vi.fn(),
}));

vi.mock('../../modules/platformRole/platformRole.service.js', () => ({
    listPlatformRoles: services.listPlatformRoles,
    getPlatformRoleById: services.getPlatformRoleById,
    createCustomPlatformRole: services.createCustomPlatformRole,
    updateCustomPlatformRole: services.updateCustomPlatformRole,
    archiveCustomPlatformRole: services.archiveCustomPlatformRole,
}));
vi.mock('../../modules/platformRole/platformRoleCatalog.service.js', () => ({
    getPlatformRolePermissionCatalogForActor:
        services.getPlatformRolePermissionCatalogForActor,
}));

import {
    create,
    list,
    listPermissions,
} from '../../modules/platformRole/platformRole.controller.js';

const makeResponse = () => {
    const res = {
        status: vi.fn(),
        json: vi.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
};


describe('platformRole controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('délègue la liste avec les paramètres validés et renvoie la pagination', async () => {
        services.listPlatformRoles.mockResolvedValue({
            roles: [{ id: 'role-1', name: 'Support technique' }],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });
        const req = {
            validated: {
                query: {
                    page: 1,
                    limit: 20,
                    status: 'active',
                },
            },
        };
        const res = makeResponse();

        await list(req, res);

        expect(services.listPlatformRoles).toHaveBeenCalledWith({
            page: 1,
            limit: 20,
            status: 'active',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                roles: [{ id: 'role-1', name: 'Support technique' }],
            },
            meta: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });
    });

    it('construit le catalogue à partir de l’acteur authentifié', async () => {
        services.getPlatformRolePermissionCatalogForActor.mockResolvedValue([
            {
                key: 'platform:overview:read',
                assignable: true,
            },
        ]);
        const req = {
            user: { id: 'actor-user-id' },
        };
        const res = makeResponse();

        await listPermissions(req, res);

        expect(
            services.getPlatformRolePermissionCatalogForActor,
        ).toHaveBeenCalledWith({
            actorId: 'actor-user-id',
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('transmet uniquement le payload Zod validé à la création', async () => {
        services.createCustomPlatformRole.mockResolvedValue({
            id: 'role-1',
            name: 'Support catalogue',
        });
        const req = {
            validated: {
                body: {
                    name: 'Support catalogue',
                    permissions: [],
                },
            },
            user: { id: 'actor-user-id' },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest',
            },
        };
        const res = makeResponse();

        await create(req, res);

        expect(services.createCustomPlatformRole).toHaveBeenCalledWith({
            roleData: {
                name: 'Support catalogue',
                permissions: [],
            },
            actorId: 'actor-user-id',
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
