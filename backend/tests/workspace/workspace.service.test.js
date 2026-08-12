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

import { createSystemRolesForWorkspace } from '../../modules/role/role.service.js';
import { Workspace } from '../../modules/workspace/workspace.model.js';

import {
    createWorkspace,
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
                new: true,
                runValidators: true,
            },
        );

        expect(result).toBe(updatedWorkspace);
    });
});