import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIT_ACTION } from '../../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';
import {
    finalizePlatformUserClosure,
} from '../../../modules/platform/users/services/finalizePlatformUserClosure.service.js';
import {
    revokeAllUserAuthSessions,
} from '../../../modules/authSessions/authSession.service.js';
import {
    assertUserIsNotPlatformFounder,
} from '../../../modules/platformTeam/platformFounderPolicy.service.js';
import { User } from '../../../modules/users/user.model.js';
import {
    WorkspaceMember,
} from '../../../modules/workspaceMember/workspaceMember.model.js';
import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

vi.mock('../../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
        findById: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));
vi.mock('../../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        find: vi.fn(),
    },
}));
vi.mock('../../../modules/authSessions/authSession.service.js', () => ({
    revokeAllUserAuthSessions: vi.fn(),
}));
vi.mock('../../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../../modules/platformTeam/platformFounderPolicy.service.js', () => ({
    assertUserIsNotPlatformFounder: vi.fn(),
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

describe('finalizePlatformUserClosure', () => {
    const session = { id: 'mongo-session' };

    beforeEach(() => {
        vi.clearAllMocks();
        assertUserIsNotPlatformFounder.mockResolvedValue(undefined);
        createAuditLog.mockResolvedValue(undefined);
        revokeAllUserAuthSessions.mockResolvedValue({ modifiedCount: 0 });
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('finalise un compte deletion_requested sans supprimer ses données', async () => {
        User.findOne.mockReturnValue(sessionQuery({
            _id: 'user-id',
            status: 'deletion_requested',
        }));
        WorkspaceMember.find.mockReturnValue(membershipQuery([]));

        const closedAt = new Date('2026-09-05T15:00:00.000Z');
        User.findOneAndUpdate.mockResolvedValue({
            _id: { toString: () => 'user-id' },
            status: 'closed',
            closedAt,
        });

        const result = await finalizePlatformUserClosure({
            userId: 'user-id',
            actorId: 'admin-id',
            reason: 'Retention policy completed',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });

        expect(assertUserIsNotPlatformFounder).toHaveBeenCalledWith({
            userId: 'user-id',
            session,
        });
        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'user-id', status: 'deletion_requested' },
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: 'closed',
                    closedBy: 'admin-id',
                    closureReason: 'Retention policy completed',
                    updatedBy: 'admin-id',
                }),
            }),
            expect.objectContaining({
                returnDocument: 'after',
                runValidators: true,
                session,
            }),
        );
        expect(revokeAllUserAuthSessions).toHaveBeenCalledWith({
            userId: 'user-id',
            revokedReason: AUTH_SESSION_REVOKED_REASON.USER_CLOSED,
            session,
        });
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.USER_CLOSED,
                entityId: 'user-id',
                metadata: {
                    reason: 'Retention policy completed',
                    revokedSessionCount: 0,
                },
            }),
            { session },
        );
        expect(result).toEqual({
            id: 'user-id',
            status: 'closed',
            closedAt,
        });
    });

    it('refuse la clôture terminale du Fondateur', async () => {
        assertUserIsNotPlatformFounder.mockRejectedValue(
            Object.assign(new Error('Fondateur protégé'), { statusCode: 403 }),
        );

        await expect(
            finalizePlatformUserClosure({
                userId: 'founder-user-id',
                actorId: 'other-super-admin-id',
                reason: 'Interdit',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(User.findOne).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('refuse de finaliser un compte qui possède encore une membership active', async () => {
        User.findOne.mockReturnValue(sessionQuery({
            _id: 'user-id',
            status: 'deletion_requested',
        }));
        WorkspaceMember.find.mockReturnValue(membershipQuery([
            {
                role: {
                    key: 'member',
                    isSystem: true,
                },
                workspace: {
                    _id: 'workspace-id',
                    status: 'active',
                },
            },
        ]));

        await expect(
            finalizePlatformUserClosure({
                userId: 'user-id',
                actorId: 'admin-id',
                reason: 'Retention policy completed',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('appartenances actives'),
        });

        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('est idempotent pour un compte déjà closed', async () => {
        User.findOne.mockReturnValue(sessionQuery(null));
        const closedAt = new Date('2026-09-05T15:00:00.000Z');
        User.findById.mockReturnValue(sessionQuery({
            _id: { toString: () => 'user-id' },
            status: 'closed',
            closedAt,
        }));

        const result = await finalizePlatformUserClosure({
            userId: 'user-id',
            actorId: 'admin-id',
            reason: 'Retry',
        });

        expect(result).toEqual({
            id: 'user-id',
            status: 'closed',
            closedAt,
        });
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
