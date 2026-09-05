import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
import {
    revokeAllUserAuthSessions,
} from '../../../modules/authSessions/authSession.service.js';
import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';
import {
    assertUserIsNotPlatformFounder,
} from '../../../modules/platformTeam/platformFounderPolicy.service.js';
import {
    disablePlatformUser,
} from '../../../modules/platform/users/services/disablePlatformUser.service.js';
import { User } from '../../../modules/users/user.model.js';

vi.mock('../../../modules/users/user.model.js', () => ({
    User: {
        findOneAndUpdate: vi.fn(),
        findById: vi.fn(),
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


describe('disablePlatformUser', () => {
    const session = { id: 'session-1' };

    beforeEach(() => {
        vi.clearAllMocks();
        assertUserIsNotPlatformFounder.mockResolvedValue(undefined);

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('désactive l’utilisateur, révoque ses sessions et audite la mutation', async () => {
        const disabledAt = new Date('2026-08-26T10:00:00.000Z');
        const disabledUser = {
            _id: { toString: () => 'target-user-id' },
            status: USER_STATUS.DISABLED,
            disabledAt,
            disabledReason: 'Violation des conditions d’utilisation',
        };

        User.findOneAndUpdate.mockResolvedValue(disabledUser);
        revokeAllUserAuthSessions.mockResolvedValue({ modifiedCount: 3 });
        createAuditLog.mockResolvedValue({});

        const result = await disablePlatformUser({
            userId: 'target-user-id',
            actorId: 'admin-user-id',
            disabledReason: 'Violation des conditions d’utilisation',
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(assertUserIsNotPlatformFounder).toHaveBeenCalledWith({
            userId: 'target-user-id',
            session,
        });
        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: 'target-user-id',
                status: USER_STATUS.ACTIVE,
            },
            {
                $set: expect.objectContaining({
                    status: USER_STATUS.DISABLED,
                    disabledBy: 'admin-user-id',
                    disabledReason: 'Violation des conditions d’utilisation',
                    updatedBy: 'admin-user-id',
                }),
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(revokeAllUserAuthSessions).toHaveBeenCalledWith({
            userId: disabledUser._id,
            revokedReason: AUTH_SESSION_REVOKED_REASON.USER_DISABLED,
            session,
        });
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: 'admin-user-id',
                action: AUDIT_ACTION.USER_DISABLED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: disabledUser._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
                metadata: {
                    disabledReason: 'Violation des conditions d’utilisation',
                    revokedSessionCount: 3,
                },
            },
            { session },
        );
        expect(result).toEqual({
            id: 'target-user-id',
            status: USER_STATUS.DISABLED,
            disabledAt,
            disabledReason: 'Violation des conditions d’utilisation',
        });
    });

    it('refuse de désactiver le Fondateur avant toute mutation User', async () => {
        assertUserIsNotPlatformFounder.mockRejectedValue(
            Object.assign(new Error('Fondateur protégé'), { statusCode: 403 }),
        );

        await expect(
            disablePlatformUser({
                userId: 'founder-user-id',
                actorId: 'other-super-admin-id',
                disabledReason: 'Test interdit',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('refuse qu’un administrateur désactive son propre compte', async () => {
        await expect(
            disablePlatformUser({
                userId: 'same-user-id',
                actorId: 'same-user-id',
                disabledReason: 'Test de désactivation',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(mongoose.connection.transaction).not.toHaveBeenCalled();
        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('retourne 404 lorsque l’utilisateur ciblé n’existe pas', async () => {
        User.findOneAndUpdate.mockResolvedValue(null);
        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue(null),
        });

        await expect(
            disablePlatformUser({
                userId: 'missing-user-id',
                actorId: 'admin-user-id',
                disabledReason: 'Compte à désactiver',
            }),
        ).rejects.toMatchObject({ statusCode: 404 });

        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('refuse la désactivation lorsque le compte n’est pas actif', async () => {
        User.findOneAndUpdate.mockResolvedValue(null);
        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue({
                _id: 'target-user-id',
                status: USER_STATUS.DISABLED,
            }),
        });

        await expect(
            disablePlatformUser({
                userId: 'target-user-id',
                actorId: 'admin-user-id',
                disabledReason: 'Compte à désactiver',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(revokeAllUserAuthSessions).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
