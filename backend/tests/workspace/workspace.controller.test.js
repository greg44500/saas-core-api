import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    create,
    getById,
    list,
    update,
} from '../../modules/workspace/workspace.controller.js';

import {
    createWorkspace,
    listUserWorkspaces,
    updateWorkspace,
} from '../../modules/workspace/workspace.service.js';


vi.mock('../../modules/workspace/workspace.service.js', () => ({
    createWorkspace: vi.fn(),
    listUserWorkspaces: vi.fn(),
    updateWorkspace: vi.fn(),
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


    it('renvoie le workspace déjà chargé dans le contexte de la requête', () => {
        const createdAt = new Date('2026-08-12T10:00:00.000Z');
        const updatedAt = new Date('2026-08-12T11:00:00.000Z');

        const req = {
            workspace: {
                _id: {
                    toString: () => 'workspace-id',
                },
                name: 'Acme',
                status: 'active',
                createdAt,
                updatedAt,
            },
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        getById(req, res);

        expect(res.status).toHaveBeenCalledWith(200);

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


    it('met à jour le workspace courant', async () => {
        const createdAt = new Date('2026-08-12T10:00:00.000Z');
        const updatedAt = new Date('2026-08-12T12:00:00.000Z');

        updateWorkspace.mockResolvedValue({
            _id: {
                toString: () => 'workspace-id',
            },
            name: 'Acme Updated',
            status: 'active',
            createdAt,
            updatedAt,
        });

        const req = {
            workspace: {
                _id: 'workspace-id',
            },
            validated: {
                body: {
                    name: 'Acme Updated',
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

        await update(req, res);

        expect(updateWorkspace).toHaveBeenCalledOnce();

        expect(updateWorkspace).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            name: 'Acme Updated',
            actorId: 'user-id',
        });

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                workspace: {
                    id: 'workspace-id',
                    name: 'Acme Updated',
                    status: 'active',
                    createdAt,
                    updatedAt,
                },
            },
        });
    });


    it('refuse la modification si le workspace devient indisponible avant l’écriture', async () => {
        updateWorkspace.mockResolvedValue(null);

        const req = {
            workspace: {
                _id: 'workspace-id',
            },
            validated: {
                body: {
                    name: 'Acme Updated',
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

        await expect(
            update(req, res),
        ).rejects.toMatchObject({
            statusCode: 403,
        });

        expect(updateWorkspace).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            name: 'Acme Updated',
            actorId: 'user-id',
        });

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it('retourne les workspaces accessibles à l’utilisateur authentifié', async () => {
        const createdAt = new Date('2026-08-12T10:00:00.000Z');
        const updatedAt = new Date('2026-08-12T11:00:00.000Z');

        const workspaces = [
            {
                id: 'workspace-owner-id',
                name: 'Agence La Baule',
                status: 'active',
                membership: {
                    id: 'membership-owner-id',
                    role: {
                        key: 'owner',
                        name: 'Propriétaire',
                    },
                },
                createdAt,
                updatedAt,
            },
            {
                id: 'workspace-member-id',
                name: 'Agence Nantes',
                status: 'active',
                membership: {
                    id: 'membership-member-id',
                    role: {
                        key: 'member',
                        name: 'Membre',
                    },
                },
                createdAt,
                updatedAt,
            },
        ];

        listUserWorkspaces.mockResolvedValue(workspaces);

        const req = {
            user: {
                id: 'user-id',
            },
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await list(req, res);

        expect(
            listUserWorkspaces,
        ).toHaveBeenCalledOnce();

        expect(
            listUserWorkspaces,
        ).toHaveBeenCalledWith(
            'user-id',
        );

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                workspaces,
            },
        });
    });
});