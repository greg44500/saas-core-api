import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { create } from '../../modules/workspace/workspace.controller.js';
import { createWorkspace } from '../../modules/workspace/workspace.service.js';


vi.mock('../../modules/workspace/workspace.service.js', () => ({
    createWorkspace: vi.fn(),
}));


describe('workspace.controller', () => {
    it('crée un workspace pour l’utilisateur authentifié', async () => {
        const createdAt = new Date('2026-08-11T10:00:00.000Z');
        const updatedAt = new Date('2026-08-11T10:00:00.000Z');

        createWorkspace.mockResolvedValue({
            _id: {
                toString: () => 'workspace-id',
            },
            name: 'Acme',
            status: 'active',
            createdAt,
            updatedAt,
        });

        const req = {
            validated: {
                body: {
                    name: 'Acme',
                },
            },
            user: {
                id: 'user-id',
            },
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await create(req, res);

        expect(createWorkspace).toHaveBeenCalledOnce();

        expect(createWorkspace).toHaveBeenCalledWith({
            name: 'Acme',
            actorId: 'user-id',
        });

        expect(res.status).toHaveBeenCalledWith(201);

        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                workspace: {
                    id: 'workspace-id',
                    name: 'Acme',
                    status: 'active',
                    createdAt,
                    updatedAt,
                },
            },
        });
    });
});