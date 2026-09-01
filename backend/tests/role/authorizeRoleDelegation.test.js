import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findRoleMock } = vi.hoisted(() => ({
    findRoleMock: vi.fn(),
}));

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        findOne: findRoleMock,
    },
}));

import {
    authorizeRoleDelegation,
} from '../../middlewares/authorizeRoleDelegation.js';

const makeRequest = ({
    actorPermissions = [],
    roleId = 'role-id',
} = {}) => ({
    workspace: { _id: 'workspace-id' },
    validated: { body: { roleId } },
    permissions: actorPermissions,
});

const makeRoleQuery = (role) => ({
    select: vi.fn(async () => role),
});

describe('authorizeRoleDelegation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('autorise un rôle dont toutes les permissions sont détenues par l’acteur', async () => {
        findRoleMock.mockReturnValue(makeRoleQuery({
            permissions: ['member:read', 'file:read'],
        }));

        const req = makeRequest({
            actorPermissions: [
                'member:read',
                'file:read',
                'member:update',
            ],
        });
        const next = vi.fn();

        await authorizeRoleDelegation(req, {}, next);

        expect(findRoleMock).toHaveBeenCalledWith({
            _id: 'role-id',
            workspace: 'workspace-id',
        });
        expect(next).toHaveBeenCalledWith();
    });

    it('refuse un rôle contenant une permission absente chez l’acteur', async () => {
        findRoleMock.mockReturnValue(makeRoleQuery({
            permissions: ['member:read', 'member:remove'],
        }));

        const req = makeRequest({
            actorPermissions: ['member:read', 'member:update'],
        });
        const next = vi.fn();

        await authorizeRoleDelegation(req, {}, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 403,
            message:
                'Vous ne pouvez pas attribuer un rôle contenant des permissions que vous ne possédez pas.',
        });
    });

    it('refuse par défaut lorsque le contexte de permissions est absent', async () => {
        const req = makeRequest();
        req.permissions = undefined;
        const next = vi.fn();

        await authorizeRoleDelegation(req, {}, next);

        expect(findRoleMock).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 403,
        });
    });

    it('refuse un rôle qui n’appartient pas au workspace courant', async () => {
        findRoleMock.mockReturnValue(makeRoleQuery(null));

        const req = makeRequest({
            actorPermissions: ['member:update'],
        });
        const next = vi.fn();

        await authorizeRoleDelegation(req, {}, next);

        expect(next.mock.calls[0][0]).toMatchObject({
            statusCode: 404,
            message: 'Rôle introuvable dans ce workspace.',
        });
    });
});
