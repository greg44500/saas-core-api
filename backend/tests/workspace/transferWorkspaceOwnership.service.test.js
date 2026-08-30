import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';
import { Role } from '../../modules/role/role.model.js';
import {
    transferWorkspaceOwnership,
} from '../../modules/workspace/transferWorkspaceOwnership.service.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';


vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: vi.fn(),
        },
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        findOne: vi.fn(),
    },
}));

vi.mock(
    '../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            findOne: vi.fn(),
            countDocuments: vi.fn(),
        },
    }),
);


const queryResolving = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});


describe('transferWorkspaceOwnership', () => {
    const session = { id: 'mongo-session' };
    const workspaceId = 'workspace-id';
    const actorId = 'owner-user-id';
    const newOwnerMemberId = 'new-owner-member-id';
    const previousOwnerRoleId = 'admin-role-id';

    const ownerRole = {
        _id: 'owner-role-id',
        key: SYSTEM_ROLE_KEY.OWNER,
        isSystem: true,
    };

    const previousOwnerRole = {
        _id: previousOwnerRoleId,
        key: SYSTEM_ROLE_KEY.ADMIN,
        isSystem: true,
    };

    let currentOwner;
    let newOwner;

    beforeEach(() => {
        vi.clearAllMocks();

        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );

        currentOwner = {
            _id: 'current-owner-member-id',
            user: actorId,
            role: ownerRole._id,
            updatedBy: actorId,
            save: vi.fn().mockResolvedValue(undefined),
        };

        newOwner = {
            _id: newOwnerMemberId,
            user: 'new-owner-user-id',
            role: 'member-role-id',
            updatedBy: 'other-user-id',
            save: vi.fn().mockResolvedValue(undefined),
        };

        Role.findOne
            .mockReturnValueOnce(queryResolving(ownerRole))
            .mockReturnValueOnce(queryResolving(previousOwnerRole));

        WorkspaceMember.findOne
            .mockReturnValueOnce(queryResolving(currentOwner))
            .mockReturnValueOnce(queryResolving(newOwner));

        WorkspaceMember.countDocuments
            .mockReturnValueOnce(queryResolving(1))
            .mockReturnValueOnce(queryResolving(1));

        createAuditLog.mockResolvedValue(undefined);
    });


    it('transfère atomiquement le rôle owner vers un autre membre actif', async () => {
        const result = await transferWorkspaceOwnership({
            workspaceId,
            newOwnerMemberId,
            previousOwnerRoleId,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(mongoose.connection.transaction).toHaveBeenCalledOnce();

        expect(Role.findOne).toHaveBeenNthCalledWith(
            1,
            {
                workspace: workspaceId,
                key: SYSTEM_ROLE_KEY.OWNER,
                isSystem: true,
            },
        );

        expect(Role.findOne).toHaveBeenNthCalledWith(
            2,
            {
                _id: previousOwnerRoleId,
                workspace: workspaceId,
            },
        );

        expect(WorkspaceMember.findOne).toHaveBeenNthCalledWith(
            1,
            {
                workspace: workspaceId,
                user: actorId,
                role: ownerRole._id,
                status: WORKSPACE_MEMBER_STATUS.ACTIVE,
            },
        );

        expect(WorkspaceMember.findOne).toHaveBeenNthCalledWith(
            2,
            {
                _id: newOwnerMemberId,
                workspace: workspaceId,
                status: WORKSPACE_MEMBER_STATUS.ACTIVE,
            },
        );

        expect(currentOwner.role).toBe(previousOwnerRole._id);
        expect(currentOwner.updatedBy).toBe(actorId);
        expect(currentOwner.save).toHaveBeenCalledWith({ session });

        expect(newOwner.role).toBe(ownerRole._id);
        expect(newOwner.updatedBy).toBe(actorId);
        expect(newOwner.save).toHaveBeenCalledWith({ session });

        expect(WorkspaceMember.countDocuments).toHaveBeenCalledTimes(2);

        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.WORKSPACE_OWNERSHIP_TRANSFERRED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: workspaceId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
                metadata: {
                    previousOwnerUserId: actorId,
                    newOwnerUserId: 'new-owner-user-id',
                    previousOwnerMemberId:
                        'current-owner-member-id',
                    newOwnerMemberId,
                    previousOwnerRoleId,
                },
            },
            { session },
        );

        expect(result).toEqual({
            previousOwner: currentOwner,
            newOwner,
        });
    });


    it('refuse une cible qui n’est pas un membre actif du workspace', async () => {
        WorkspaceMember.findOne
            .mockReset()
            .mockReturnValueOnce(queryResolving(currentOwner))
            .mockReturnValueOnce(queryResolving(null));

        await expect(
            transferWorkspaceOwnership({
                workspaceId,
                newOwnerMemberId,
                previousOwnerRoleId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
            message:
                'Le nouveau propriétaire doit être un membre actif du workspace',
        });

        expect(currentOwner.save).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('refuse un rôle de remplacement appartenant au rôle owner', async () => {
        Role.findOne
            .mockReset()
            .mockReturnValueOnce(queryResolving(ownerRole))
            .mockReturnValueOnce(queryResolving(ownerRole));

        await expect(
            transferWorkspaceOwnership({
                workspaceId,
                newOwnerMemberId,
                previousOwnerRoleId: ownerRole._id,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Le rôle de remplacement ne peut pas être le rôle propriétaire',
        });

        expect(WorkspaceMember.findOne).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('refuse si l’acteur n’est plus l’owner actif au moment de la transaction', async () => {
        WorkspaceMember.findOne
            .mockReset()
            .mockReturnValueOnce(queryResolving(null));

        await expect(
            transferWorkspaceOwnership({
                workspaceId,
                newOwnerMemberId,
                previousOwnerRoleId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 403,
            message:
                'Seul le propriétaire actuel peut transférer la propriété du workspace',
        });

        expect(WorkspaceMember.countDocuments).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('refuse un workspace qui ne possède pas exactement un owner actif avant mutation', async () => {
        WorkspaceMember.countDocuments
            .mockReset()
            .mockReturnValueOnce(queryResolving(2));

        await expect(
            transferWorkspaceOwnership({
                workspaceId,
                newOwnerMemberId,
                previousOwnerRoleId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Le workspace doit posséder exactement un propriétaire actif avant le transfert',
        });

        expect(currentOwner.save).not.toHaveBeenCalled();
        expect(newOwner.save).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('annule le workflow si l’invariant d’un owner actif n’est pas conservé après mutation', async () => {
        WorkspaceMember.countDocuments
            .mockReset()
            .mockReturnValueOnce(queryResolving(1))
            .mockReturnValueOnce(queryResolving(0));

        await expect(
            transferWorkspaceOwnership({
                workspaceId,
                newOwnerMemberId,
                previousOwnerRoleId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Le transfert doit conserver exactement un propriétaire actif',
        });

        expect(currentOwner.save).toHaveBeenCalledWith({ session });
        expect(newOwner.save).toHaveBeenCalledWith({ session });
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('refuse les paramètres obligatoires manquants avant toute transaction', async () => {
        await expect(
            transferWorkspaceOwnership({
                workspaceId,
                newOwnerMemberId,
                actorId,
            }),
        ).rejects.toThrow(
            'workspaceId, newOwnerMemberId, previousOwnerRoleId and actorId are required to transfer workspace ownership',
        );

        expect(mongoose.connection.transaction).not.toHaveBeenCalled();
    });
});
