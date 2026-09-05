import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AUDIT_ACTION,
} from '../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import {
    confirmCurrentUserPassword,
} from '../../modules/auth/services/confirmCurrentUserPassword.service.js';
import {
    revokeAllUserAuthSessions,
} from '../../modules/authSessions/authSession.service.js';
import {
    releaseCurrentUsageMetric,
} from '../../modules/usageMetric/releaseUsageMetric.service.js';
import {
    requestCurrentUserClosure,
} from '../../modules/users/userClosure.service.js';
import { User } from '../../modules/users/user.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';
import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';

vi.mock('../../modules/auth/services/confirmCurrentUserPassword.service.js', () => ({
    confirmCurrentUserPassword: vi.fn(),
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
    revokeAllUserAuthSessions: vi.fn(),
}));

vi.mock('../../modules/usageMetric/releaseUsageMetric.service.js', () => ({
    releaseCurrentUsageMetric: vi.fn(),
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        countDocuments: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        find: vi.fn(),
    },
}));

const sessionQuery = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const membershipQuery = (memberships) => {
    const query = {
        populate: vi.fn(),
        session: vi.fn().mockResolvedValue(memberships),
    };
    query.populate.mockReturnValue(query);
    return query;
};

describe('requestCurrentUserClosure', () => {
    const session = { id: 'mongo-session' };

    beforeEach(() => {
        vi.clearAllMocks();
        confirmCurrentUserPassword.mockResolvedValue(undefined);
        createAuditLog.mockResolvedValue(undefined);
        releaseCurrentUsageMetric.mockResolvedValue({});
        revokeAllUserAuthSessions.mockResolvedValue({ modifiedCount: 2 });
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('refuse la fermeture tant que le User possède un workspace ouvert', async () => {
        User.findOne.mockReturnValue(sessionQuery({
            _id: 'user-id',
            emailCanonical: 'greg@example.com',
            status: 'active',
            platformRole: 'user',
        }));

        WorkspaceMember.find.mockReturnValue(membershipQuery([
            {
                _id: 'member-id',
                role: {
                    key: 'owner',
                    isSystem: true,
                    workspace: { toString: () => 'workspace-id' },
                },
                workspace: {
                    _id: { toString: () => 'workspace-id' },
                    status: 'active',
                },
            },
        ]));

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('Transférez ou fermez'),
        });

        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
    });

    it('refuse la fermeture du dernier super-admin actif', async () => {
        User.findOne.mockReturnValue(sessionQuery({
            _id: 'user-id',
            emailCanonical: 'admin@example.com',
            status: 'active',
            platformRole: 'super_admin',
        }));
        User.countDocuments.mockReturnValue(sessionQuery(1));

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'admin@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('dernier super-admin actif'),
        });

        expect(WorkspaceMember.find).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('retire les memberships, révoque les sessions et passe le compte en deletion_requested', async () => {
        User.findOne.mockReturnValue(sessionQuery({
            _id: 'user-id',
            emailCanonical: 'greg@example.com',
            status: 'active',
            platformRole: 'user',
        }));

        const membership = {
            _id: 'member-id',
            user: 'user-id',
            status: 'active',
            role: {
                key: 'member',
                isSystem: true,
                workspace: { toString: () => 'workspace-id' },
            },
            workspace: {
                _id: { toString: () => 'workspace-id' },
                status: 'active',
            },
            save: vi.fn().mockResolvedValue(undefined),
        };

        WorkspaceMember.find.mockReturnValue(
            membershipQuery([membership]),
        );

        const deletionRequestedAt = new Date('2026-09-05T12:00:00.000Z');
        User.findOneAndUpdate.mockResolvedValue({
            _id: { toString: () => 'user-id' },
            status: 'deletion_requested',
            deletionRequestedAt,
        });

        const result = await requestCurrentUserClosure({
            userId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationEmail: 'Greg@Example.com',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });

        expect(confirmCurrentUserPassword).toHaveBeenCalledWith({
            userId: 'user-id',
            password: 'Correct Horse Battery Staple',
        });
        expect(membership.status).toBe('removed');
        expect(membership.save).toHaveBeenCalledWith({ session });
        expect(releaseCurrentUsageMetric).toHaveBeenCalledWith(
            expect.objectContaining({
                workspaceId: membership.workspace._id,
                amount: 1,
                actorId: 'user-id',
                session,
            }),
        );
        expect(revokeAllUserAuthSessions).toHaveBeenCalledWith({
            userId: 'user-id',
            revokedReason:
                AUTH_SESSION_REVOKED_REASON.USER_DELETION_REQUESTED,
            session,
        });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.USER_DELETION_REQUESTED,
                entityId: 'user-id',
                metadata: {
                    removedMembershipCount: 1,
                    revokedSessionCount: 2,
                },
            }),
            { session },
        );
        expect(result).toEqual({
            id: 'user-id',
            status: 'deletion_requested',
            deletionRequestedAt,
            removedMembershipCount: 1,
            revokedSessionCount: 2,
        });
    });

    it('échoue en sécurité si une membership active référence un contexte incohérent', async () => {
        User.findOne.mockReturnValue(sessionQuery({
            _id: 'user-id',
            emailCanonical: 'greg@example.com',
            status: 'active',
            platformRole: 'user',
        }));
        WorkspaceMember.find.mockReturnValue(membershipQuery([
            {
                _id: 'member-id',
                role: null,
                workspace: {
                    _id: { toString: () => 'workspace-id' },
                    status: 'active',
                },
            },
        ]));

        await expect(
            requestCurrentUserClosure({
                userId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationEmail: 'greg@example.com',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('incohérente'),
        });

        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });
});
