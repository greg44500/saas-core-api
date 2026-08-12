import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import mongoose from 'mongoose';

import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../constants/workspace.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';

import { createSystemRolesForWorkspace } from '../../modules/role/role.service.js';
import { Workspace } from '../../modules/workspace/workspace.model.js';

import {
    createWorkspace,
    listUserWorkspaces,
    updateWorkspace,
} from '../../modules/workspace/workspace.service.js';

import { WorkspaceMember } from '../../modules/workspaceMember/workspaceMember.model.js';


vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: vi.fn(),
        },
    },
}));

vi.mock('../../modules/role/role.service.js', () => ({
    createSystemRolesForWorkspace: vi.fn(),
}));

vi.mock('../../modules/workspace/workspace.model.js', () => ({
    Workspace: {
        create: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));

vi.mock(
    '../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            create: vi.fn(),
            find: vi.fn(),
        },
    }),
);


describe('createWorkspace', () => {
    const actorId = 'actor-id';
    const session = { id: 'mongo-session' };

    beforeEach(() => {
        vi.clearAllMocks();

        /*
         * Simule l'exécution du callback fourni à la transaction
         * avec une même session MongoDB.
         */
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );
    });


    it('crée le workspace, ses rôles et son owner dans la même transaction', async () => {
        const workspace = {
            _id: 'workspace-id',
            name: 'Acme',
        };

        const ownerRole = {
            _id: 'owner-role-id',
            key: SYSTEM_ROLE_KEY.OWNER,
        };

        Workspace.create.mockResolvedValue([workspace]);

        createSystemRolesForWorkspace.mockResolvedValue([
            ownerRole,
        ]);

        WorkspaceMember.create.mockResolvedValue([
            {
                _id: 'membership-id',
            },
        ]);

        const result = await createWorkspace({
            name: 'Acme',
            actorId,
        });

        expect(mongoose.connection.transaction).toHaveBeenCalledOnce();

        expect(Workspace.create).toHaveBeenCalledWith(
            [
                {
                    name: 'Acme',
                    statusChangedBy: actorId,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ],
            {
                session,
            },
        );

        expect(
            createSystemRolesForWorkspace,
        ).toHaveBeenCalledWith({
            workspaceId: workspace._id,
            actorId,
            session,
        });

        expect(WorkspaceMember.create).toHaveBeenCalledWith(
            [
                {
                    workspace: workspace._id,
                    user: actorId,
                    role: ownerRole._id,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ],
            {
                session,
            },
        );

        expect(result).toBe(workspace);
    });


    it('échoue si le rôle système owner n’est pas créé', async () => {
        const workspace = {
            _id: 'workspace-id',
            name: 'Acme',
        };

        Workspace.create.mockResolvedValue([workspace]);

        createSystemRolesForWorkspace.mockResolvedValue([
            {
                _id: 'member-role-id',
                key: SYSTEM_ROLE_KEY.MEMBER,
            },
        ]);

        await expect(
            createWorkspace({
                name: 'Acme',
                actorId,
            }),
        ).rejects.toThrow(
            'Owner system role was not created for the workspace',
        );

        expect(WorkspaceMember.create).not.toHaveBeenCalled();
    });
});


describe('listUserWorkspaces', () => {
    let query;

    beforeEach(() => {
        vi.clearAllMocks();

        /*
         * Simule la chaîne Mongoose :
         * find → select → populate → populate → lean.
         *
         * Le but n'est pas de retester Mongoose, mais de contrôler
         * la requête construite par notre service.
         */
        query = {
            select: vi.fn(),
            populate: vi.fn(),
            lean: vi.fn(),
        };

        query.select.mockReturnValue(query);
        query.populate.mockReturnValue(query);

        WorkspaceMember.find.mockReturnValue(query);
    });


    it('retourne les workspaces actifs associés aux memberships actifs', async () => {
        const createdAt = new Date('2026-08-12T10:00:00.000Z');
        const updatedAt = new Date('2026-08-12T11:00:00.000Z');

        query.lean.mockResolvedValue([
            {
                _id: 'membership-owner-id',
                workspace: {
                    _id: 'workspace-owner-id',
                    name: 'Agence La Baule',
                    status: WORKSPACE_STATUS.ACTIVE,
                    createdAt,
                    updatedAt,
                },
                role: {
                    _id: 'owner-role-id',
                    key: SYSTEM_ROLE_KEY.OWNER,
                    name: 'Propriétaire',
                    workspace: 'workspace-owner-id',
                },
            },
            {
                _id: 'membership-member-id',
                workspace: {
                    _id: 'workspace-member-id',
                    name: 'Agence Nantes',
                    status: WORKSPACE_STATUS.ACTIVE,
                    createdAt,
                    updatedAt,
                },
                role: {
                    _id: 'member-role-id',
                    key: SYSTEM_ROLE_KEY.MEMBER,
                    name: 'Membre',
                    workspace: 'workspace-member-id',
                },
            },
        ]);

        const result = await listUserWorkspaces('user-id');

        expect(WorkspaceMember.find).toHaveBeenCalledWith({
            user: 'user-id',
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        });

        expect(query.select).toHaveBeenCalledWith(
            '_id workspace role',
        );

        expect(query.populate).toHaveBeenNthCalledWith(
            1,
            {
                path: 'workspace',
                match: {
                    status: WORKSPACE_STATUS.ACTIVE,
                },
                select: '_id name status createdAt updatedAt',
            },
        );

        expect(query.populate).toHaveBeenNthCalledWith(
            2,
            {
                path: 'role',
                select: '_id key name workspace',
            },
        );

        expect(query.lean).toHaveBeenCalledOnce();

        expect(result).toEqual([
            {
                id: 'workspace-owner-id',
                name: 'Agence La Baule',
                status: WORKSPACE_STATUS.ACTIVE,
                membership: {
                    id: 'membership-owner-id',
                    role: {
                        key: SYSTEM_ROLE_KEY.OWNER,
                        name: 'Propriétaire',
                    },
                },
                createdAt,
                updatedAt,
            },
            {
                id: 'workspace-member-id',
                name: 'Agence Nantes',
                status: WORKSPACE_STATUS.ACTIVE,
                membership: {
                    id: 'membership-member-id',
                    role: {
                        key: SYSTEM_ROLE_KEY.MEMBER,
                        name: 'Membre',
                    },
                },
                createdAt,
                updatedAt,
            },
        ]);
    });


    it('exclut un membership dont le workspace n’est pas actif', async () => {
        /*
         * Avec populate({ match }), Mongoose conserve le document
         * WorkspaceMember mais remplace workspace par null lorsque
         * le workspace ne correspond pas au filtre ACTIVE.
         */
        query.lean.mockResolvedValue([
            {
                _id: 'membership-id',
                workspace: null,
                role: {
                    _id: 'member-role-id',
                    key: SYSTEM_ROLE_KEY.MEMBER,
                    name: 'Membre',
                    workspace: 'workspace-id',
                },
            },
        ]);

        const result = await listUserWorkspaces('user-id');

        expect(result).toEqual([]);
    });


    it('exclut un membership dont le rôle est absent ou appartient à un autre workspace', async () => {
        query.lean.mockResolvedValue([
            {
                _id: 'membership-without-role',
                workspace: {
                    _id: 'workspace-a',
                    name: 'Workspace A',
                    status: WORKSPACE_STATUS.ACTIVE,
                },
                role: null,
            },
            {
                _id: 'membership-invalid-role',
                workspace: {
                    _id: 'workspace-b',
                    name: 'Workspace B',
                    status: WORKSPACE_STATUS.ACTIVE,
                },
                role: {
                    _id: 'role-id',
                    key: SYSTEM_ROLE_KEY.MEMBER,
                    name: 'Membre',
                    workspace: 'another-workspace',
                },
            },
        ]);

        const result = await listUserWorkspaces('user-id');

        expect(result).toEqual([]);
    });


    it('n’expose pas les champs internes du membership, du rôle ou du workspace', async () => {
        query.lean.mockResolvedValue([
            {
                _id: 'membership-id',
                user: 'user-id',
                status: WORKSPACE_MEMBER_STATUS.ACTIVE,
                workspace: {
                    _id: 'workspace-id',
                    name: 'Acme',
                    status: WORKSPACE_STATUS.ACTIVE,
                    createdBy: 'creator-id',
                    updatedBy: 'updater-id',
                },
                role: {
                    _id: 'role-id',
                    key: SYSTEM_ROLE_KEY.OWNER,
                    name: 'Propriétaire',
                    workspace: 'workspace-id',
                    permissions: [
                        'workspace:read',
                        'workspace:update',
                    ],
                    isSystem: true,
                },
            },
        ]);

        const [workspace] = await listUserWorkspaces('user-id');

        expect(workspace).toEqual({
            id: 'workspace-id',
            name: 'Acme',
            status: WORKSPACE_STATUS.ACTIVE,
            membership: {
                id: 'membership-id',
                role: {
                    key: SYSTEM_ROLE_KEY.OWNER,
                    name: 'Propriétaire',
                },
            },
            createdAt: undefined,
            updatedAt: undefined,
        });

        expect(workspace.membership).not.toHaveProperty('user');
        expect(workspace.membership).not.toHaveProperty('status');

        expect(workspace.membership.role).not.toHaveProperty(
            'permissions',
        );
        expect(workspace.membership.role).not.toHaveProperty(
            'workspace',
        );
        expect(workspace.membership.role).not.toHaveProperty(
            'isSystem',
        );

        expect(workspace).not.toHaveProperty('createdBy');
        expect(workspace).not.toHaveProperty('updatedBy');
    });
});


describe('updateWorkspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('met à jour le nom et updatedBy uniquement si le workspace est actif', async () => {
        const updatedWorkspace = {
            _id: 'workspace-id',
            name: 'Acme Updated',
            status: WORKSPACE_STATUS.ACTIVE,
        };

        Workspace.findOneAndUpdate.mockResolvedValue(
            updatedWorkspace,
        );

        const result = await updateWorkspace({
            workspaceId: 'workspace-id',
            name: 'Acme Updated',
            actorId: 'actor-id',
        });

        expect(
            Workspace.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            {
                _id: 'workspace-id',
                status: WORKSPACE_STATUS.ACTIVE,
            },
            {
                $set: {
                    name: 'Acme Updated',
                    updatedBy: 'actor-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
        );

        expect(result).toBe(updatedWorkspace);
    });
});