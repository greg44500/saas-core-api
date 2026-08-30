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
    WORKSPACE_INVITATION_STATUS,
    WORKSPACE_INVITATION_TTL_DAYS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { Role } from '../../modules/role/role.model.js';
import { User } from '../../modules/users/user.model.js';
import {
    WorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.model.js';
import {
    createWorkspaceInvitation,
    revokeWorkspaceInvitation,
} from '../../modules/workspaceInvitation/workspaceInvitation.service.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';

vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: vi.fn(),
        },
        trusted: vi.fn((value) => value),
        Types: {
            ObjectId: vi.fn((value) => value),
        },
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        collection: {
            name: 'roles',
        },
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
    },
}));

vi.mock(
    '../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            findOne: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/workspaceInvitation/workspaceInvitation.model.js',
    () => ({
        WorkspaceInvitation: {
            aggregate: vi.fn(),
            create: vi.fn(),
            findOne: vi.fn(),
            findOneAndUpdate: vi.fn(),
            updateMany: vi.fn(),
        },
    }),
);

const queryWithSession = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const selectableQueryWithSession = (value) => {
    const query = {
        select: vi.fn(),
        session: vi.fn().mockResolvedValue(value),
    };

    query.select.mockReturnValue(query);

    return query;
};

const prepareTransaction = () => {
    const session = {
        id: 'mongo-session',
    };

    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );

    return session;
};

describe('workspace invitation services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('crée une invitation valable exactement sept jours sans stocker le token brut', async () => {
        const session = prepareTransaction();
        const now = new Date('2026-08-30T08:00:00.000Z');
        const invitation = {
            _id: 'invitation-id',
        };

        Role.findOne.mockReturnValue(
            queryWithSession({
                _id: 'role-id',
                key: SYSTEM_ROLE_KEY.MEMBER,
                isSystem: true,
            }),
        );
        User.findOne.mockReturnValue(
            selectableQueryWithSession(null),
        );
        WorkspaceInvitation.updateMany.mockReturnValue(
            queryWithSession({ modifiedCount: 0 }),
        );
        WorkspaceInvitation.findOne.mockReturnValue(
            queryWithSession(null),
        );
        WorkspaceInvitation.create.mockResolvedValue([
            invitation,
        ]);
        createAuditLog.mockResolvedValue(undefined);

        const result = await createWorkspaceInvitation({
            workspaceId: 'workspace-id',
            email: ' Person@Example.COM ',
            roleId: 'role-id',
            actorId: 'actor-id',
            now,
        });

        expect(result.invitation).toBe(invitation);
        expect(result.token).toMatch(/^[a-f\d]{64}$/);

        const [[createdInvitation], createOptions] =
            WorkspaceInvitation.create.mock.calls[0];

        expect(createOptions).toEqual({ session });
        expect(createdInvitation.emailCanonical)
            .toBe('person@example.com');
        expect(createdInvitation.tokenHash)
            .toMatch(/^[a-f\d]{64}$/);
        expect(createdInvitation.tokenHash)
            .not.toBe(result.token);
        expect(createdInvitation.expiresAt).toEqual(
            new Date(
                now.getTime()
                + WORKSPACE_INVITATION_TTL_DAYS
                    * 24 * 60 * 60 * 1000,
            ),
        );

        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                actor: 'actor-id',
                workspace: 'workspace-id',
                action: AUDIT_ACTION.MEMBER_INVITED,
                entityType:
                    AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
            }),
            { session },
        );

        const auditPayload = createAuditLog.mock.calls[0][0];
        expect(auditPayload.metadata.email).toBeUndefined();
    });

    it('refuse explicitement le rôle système owner', async () => {
        prepareTransaction();

        Role.findOne.mockReturnValue(
            queryWithSession({
                _id: 'owner-role-id',
                key: SYSTEM_ROLE_KEY.OWNER,
                isSystem: true,
            }),
        );

        await expect(
            createWorkspaceInvitation({
                workspaceId: 'workspace-id',
                email: 'person@example.com',
                roleId: 'owner-role-id',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message:
                'Le rôle owner ne peut pas être attribué par invitation.',
        });

        expect(WorkspaceInvitation.create)
            .not.toHaveBeenCalled();
    });

    it('refuse une invitation lorsque le compte est déjà membre actif', async () => {
        prepareTransaction();

        Role.findOne.mockReturnValue(
            queryWithSession({
                _id: 'role-id',
                key: SYSTEM_ROLE_KEY.MEMBER,
                isSystem: true,
            }),
        );
        User.findOne.mockReturnValue(
            selectableQueryWithSession({
                _id: 'user-id',
            }),
        );
        WorkspaceMember.findOne.mockReturnValue(
            queryWithSession({
                status: WORKSPACE_MEMBER_STATUS.ACTIVE,
            }),
        );

        await expect(
            createWorkspaceInvitation({
                workspaceId: 'workspace-id',
                email: 'person@example.com',
                roleId: 'role-id',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Cet utilisateur appartient déjà à ce workspace.',
        });

        expect(WorkspaceInvitation.create)
            .not.toHaveBeenCalled();
    });

    it('autorise une nouvelle invitation pour un ancien membership removed', async () => {
        prepareTransaction();

        Role.findOne.mockReturnValue(
            queryWithSession({
                _id: 'role-id',
                key: SYSTEM_ROLE_KEY.MEMBER,
                isSystem: true,
            }),
        );
        User.findOne.mockReturnValue(
            selectableQueryWithSession({
                _id: 'user-id',
            }),
        );
        WorkspaceMember.findOne.mockReturnValue(
            queryWithSession({
                status: WORKSPACE_MEMBER_STATUS.REMOVED,
            }),
        );
        WorkspaceInvitation.updateMany.mockReturnValue(
            queryWithSession({ modifiedCount: 0 }),
        );
        WorkspaceInvitation.findOne.mockReturnValue(
            queryWithSession(null),
        );
        WorkspaceInvitation.create.mockResolvedValue([
            { _id: 'invitation-id' },
        ]);
        createAuditLog.mockResolvedValue(undefined);

        await expect(
            createWorkspaceInvitation({
                workspaceId: 'workspace-id',
                email: 'person@example.com',
                roleId: 'role-id',
                actorId: 'actor-id',
            }),
        ).resolves.toMatchObject({
            invitation: {
                _id: 'invitation-id',
            },
        });
    });

    it('révoque une invitation active et audite la mutation dans la transaction', async () => {
        const session = prepareTransaction();
        const now = new Date('2026-08-30T08:00:00.000Z');
        const invitation = {
            _id: 'invitation-id',
            status: WORKSPACE_INVITATION_STATUS.REVOKED,
        };

        WorkspaceInvitation.findOneAndUpdate
            .mockResolvedValue(invitation);
        createAuditLog.mockResolvedValue(undefined);

        const result = await revokeWorkspaceInvitation({
            workspaceId: 'workspace-id',
            invitationId: 'invitation-id',
            actorId: 'actor-id',
            now,
        });

        expect(result).toBe(invitation);
        expect(
            WorkspaceInvitation.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: 'invitation-id',
                workspace: 'workspace-id',
                status: WORKSPACE_INVITATION_STATUS.PENDING,
            }),
            {
                $set: {
                    status:
                        WORKSPACE_INVITATION_STATUS.REVOKED,
                    revokedBy: 'actor-id',
                    revokedAt: now,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: 'actor-id',
                workspace: 'workspace-id',
                action:
                    AUDIT_ACTION.MEMBER_INVITATION_REVOKED,
                entityType:
                    AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: null,
                userAgent: null,
            },
            { session },
        );
    });
});
