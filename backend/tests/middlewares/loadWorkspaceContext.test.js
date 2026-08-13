import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';

import { Role } from '../../modules/role/role.model.js';
import { Workspace } from '../../modules/workspace/workspace.model.js';
import { WorkspaceMember } from '../../modules/workspaceMember/workspaceMember.model.js';


vi.mock('../../modules/workspace/workspace.model.js', () => ({
    Workspace: {
        findById: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        findOne: vi.fn(),
    },
}));


describe('loadWorkspaceContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('charge le contexte du workspace pour un membre actif', async () => {
        const workspace = {
            _id: 'workspace-id',
            name: 'Workspace Test',
            status: 'active',
        };

        const membership = {
            _id: 'membership-id',
            workspace: 'workspace-id',
            user: 'user-id',
            role: 'role-id',
            status: 'active',
        };

        const role = {
            _id: 'role-id',
            workspace: 'workspace-id',
            key: 'owner',
            permissions: [
                'workspace:read',
                'workspace:update',
                'member:read',
            ],
        };

        Workspace.findById.mockResolvedValue(workspace);
        WorkspaceMember.findOne.mockResolvedValue(membership);
        Role.findOne.mockResolvedValue(role);

        const req = {
            params: {
                workspaceId: 'workspace-id',
            },
            user: {
                _id: 'user-id',
            },
        };

        const next = vi.fn();

        await loadWorkspaceContext(req, {}, next);

        expect(Workspace.findById).toHaveBeenCalledWith(
            'workspace-id',
        );

        expect(WorkspaceMember.findOne).toHaveBeenCalledWith({
            workspace: 'workspace-id',
            user: 'user-id',
            status: 'active',
        });

        expect(Role.findOne).toHaveBeenCalledWith({
            _id: 'role-id',
            workspace: 'workspace-id',
        });

        expect(req.workspace).toBe(workspace);
        expect(req.membership).toBe(membership);
        expect(req.role).toBe(role);
        expect(req.permissions).toEqual(role.permissions);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });


    it('refuse un workspace non actif avant de charger le membership', async () => {
        Workspace.findById.mockResolvedValue({
            _id: 'workspace-id',
            status: 'suspended',
        });

        const req = {
            params: {
                workspaceId: 'workspace-id',
            },
            user: {
                _id: 'user-id',
            },
        };

        const next = vi.fn();

        await loadWorkspaceContext(req, {}, next);

        expect(WorkspaceMember.findOne).not.toHaveBeenCalled();
        expect(Role.findOne).not.toHaveBeenCalled();

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toEqual(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });


    it('refuse un utilisateur sans membership actif dans le workspace', async () => {
        Workspace.findById.mockResolvedValue({
            _id: 'workspace-id',
            status: 'active',
        });

        WorkspaceMember.findOne.mockResolvedValue(null);

        const req = {
            params: {
                workspaceId: 'workspace-id',
            },
            user: {
                _id: 'user-id',
            },
        };

        const next = vi.fn();

        await loadWorkspaceContext(req, {}, next);

        expect(WorkspaceMember.findOne).toHaveBeenCalledWith({
            workspace: 'workspace-id',
            user: 'user-id',
            status: 'active',
        });

        expect(Role.findOne).not.toHaveBeenCalled();

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toEqual(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });


    it('refuse un membership dont le rôle ne peut pas être validé dans le workspace', async () => {
        Workspace.findById.mockResolvedValue({
            _id: 'workspace-id',
            status: 'active',
        });

        WorkspaceMember.findOne.mockResolvedValue({
            _id: 'membership-id',
            workspace: 'workspace-id',
            user: 'user-id',
            role: 'role-id',
            status: 'active',
        });

        Role.findOne.mockResolvedValue(null);

        const req = {
            params: {
                workspaceId: 'workspace-id',
            },
            user: {
                _id: 'user-id',
            },
        };

        const next = vi.fn();

        await loadWorkspaceContext(req, {}, next);

        expect(Role.findOne).toHaveBeenCalledWith({
            _id: 'role-id',
            workspace: 'workspace-id',
        });

        expect(next).toHaveBeenCalledOnce();

        const error = next.mock.calls[0][0];

        expect(error).toEqual(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });
});