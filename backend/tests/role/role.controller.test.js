import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    create,
    list,
    remove,
    update,
} from '../../modules/role/role.controller.js';
import {
    createWorkspaceRole,
    deleteWorkspaceRole,
    listWorkspaceRoles,
    updateWorkspaceRole,
} from '../../modules/role/role.service.js';

vi.mock('../../modules/role/role.service.js', () => ({
    createWorkspaceRole: vi.fn(),
    deleteWorkspaceRole: vi.fn(),
    listWorkspaceRoles: vi.fn(),
    updateWorkspaceRole: vi.fn(),
}));

const makeResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
});

describe('role.controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne les rôles du workspace courant', async () => {
        const roles = [{ id: 'role-admin', name: 'Administrateur' }];
        listWorkspaceRoles.mockResolvedValue(roles);
        const req = { workspace: { _id: 'workspace-id' } };
        const res = makeResponse();

        await list(req, res);

        expect(listWorkspaceRoles).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { roles },
        });
    });

    it('transmet le contexte autorisé lors de la création', async () => {
        const role = { id: 'role-custom', name: 'Support' };
        createWorkspaceRole.mockResolvedValue(role);
        const req = {
            workspace: { _id: 'workspace-id' },
            user: { id: 'actor-id' },
            permissions: ['role:create', 'member:read'],
            validated: {
                body: {
                    name: 'Support',
                    permissions: ['member:read'],
                },
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest',
            },
        };
        const res = makeResponse();

        await create(req, res);

        expect(createWorkspaceRole).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            actorId: 'actor-id',
            actorPermissions: ['role:create', 'member:read'],
            name: 'Support',
            permissions: ['member:read'],
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('transmet uniquement les changements validés lors de la modification', async () => {
        const role = { id: 'role-custom', name: 'Support senior' };
        updateWorkspaceRole.mockResolvedValue(role);
        const req = {
            workspace: { _id: 'workspace-id' },
            user: { id: 'actor-id' },
            permissions: ['role:update', 'member:read'],
            validated: {
                params: { roleId: 'role-id' },
                body: { name: 'Support senior' },
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: null,
            },
        };
        const res = makeResponse();

        await update(req, res);

        expect(updateWorkspaceRole).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            roleId: 'role-id',
            actorId: 'actor-id',
            actorPermissions: ['role:update', 'member:read'],
            changes: { name: 'Support senior' },
            ipAddress: '127.0.0.1',
            userAgent: null,
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retourne 204 après suppression logique', async () => {
        deleteWorkspaceRole.mockResolvedValue(undefined);
        const req = {
            workspace: { _id: 'workspace-id' },
            user: { id: 'actor-id' },
            validated: { params: { roleId: 'role-id' } },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: null,
            },
        };
        const res = makeResponse();

        await remove(req, res);

        expect(deleteWorkspaceRole).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            roleId: 'role-id',
            actorId: 'actor-id',
            ipAddress: '127.0.0.1',
            userAgent: null,
        });
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalledOnce();
    });
});
