import { describe, expect, it, vi } from 'vitest';

import { list } from '../../modules/role/role.controller.js';
import { listWorkspaceRoles } from '../../modules/role/role.service.js';

vi.mock('../../modules/role/role.service.js', () => ({
    listWorkspaceRoles: vi.fn(),
}));

describe('role.controller', () => {
    it('retourne les rôles du workspace courant', async () => {
        const roles = [
            {
                id: 'role-admin',
                key: 'admin',
                name: 'Administrateur',
                description: null,
                isSystem: true,
                isEditable: false,
            },
        ];

        listWorkspaceRoles.mockResolvedValue(roles);

        const req = {
            workspace: {
                _id: 'workspace-id',
            },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

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
});
