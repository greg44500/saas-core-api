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
    revokeAllUserAuthSessions,
} from '../../../modules/authSessions/authSession.service.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    revokePlatformUserSessions,
} from '../../../modules/platform/services/revokePlatformUserSessions.service.js';

import { User } from '../../../modules/users/user.model.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            findById: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/authSessions/authSession.service.js',
    () => ({
        revokeAllUserAuthSessions: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);


describe('revokePlatformUserSessions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('révoque les sessions actives et audite l’action', async () => {
        const user = {
            _id: {
                toString: () => 'target-user-id',
            },
        };

        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(user),
        });

        revokeAllUserAuthSessions.mockResolvedValue({
            modifiedCount: 3,
        });

        createAuditLog.mockResolvedValue({});

        const result =
            await revokePlatformUserSessions({
                userId: 'target-user-id',
                actorId: 'super-admin-id',
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
            });

        expect(
            User.findById,
        ).toHaveBeenCalledWith(
            'target-user-id',
        );

        expect(
            revokeAllUserAuthSessions,
        ).toHaveBeenCalledWith({
            userId: user._id,
            revokedReason:
                AUTH_SESSION_REVOKED_REASON
                    .ADMIN_REVOKED,
        });

        expect(
            createAuditLog,
        ).toHaveBeenCalledWith({
            actor: 'super-admin-id',
            action:
                AUDIT_ACTION.SESSION_REVOKED,
            entityType:
                AUDIT_ENTITY_TYPE.USER,
            entityId: user._id,
            status:
                AUDIT_STATUS.SUCCESS,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
            metadata: {
                revokedReason:
                    AUTH_SESSION_REVOKED_REASON
                        .ADMIN_REVOKED,
                revokedSessionCount: 3,
            },
        });

        expect(result).toEqual({
            userId: 'target-user-id',
            revokedSessionCount: 3,
        });
    });

    it('retourne 404 lorsque l’utilisateur n’existe pas', async () => {
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(
                null,
            ),
        });

        await expect(
            revokePlatformUserSessions({
                userId: 'missing-user-id',
                actorId: 'super-admin-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('reste réussi lorsqu’aucune session active n’existe', async () => {
        const user = {
            _id: {
                toString: () => 'target-user-id',
            },
        };

        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(user),
        });

        revokeAllUserAuthSessions.mockResolvedValue({
            modifiedCount: 0,
        });

        createAuditLog.mockResolvedValue({});

        const result =
            await revokePlatformUserSessions({
                userId: 'target-user-id',
                actorId: 'super-admin-id',
            });

        expect(result).toEqual({
            userId: 'target-user-id',
            revokedSessionCount: 0,
        });
    });

    it('ne remet pas en cause la révocation lorsque l’audit échoue', async () => {
        const user = {
            _id: {
                toString: () => 'target-user-id',
            },
        };

        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(user),
        });

        revokeAllUserAuthSessions.mockResolvedValue({
            modifiedCount: 2,
        });

        createAuditLog.mockRejectedValue(
            new Error('Audit unavailable'),
        );

        vi.spyOn(
            console,
            'error',
        ).mockImplementation(() => {  });

        const result =
            await revokePlatformUserSessions({
                userId: 'target-user-id',
                actorId: 'super-admin-id',
            });

        expect(result).toEqual({
            userId: 'target-user-id',
            revokedSessionCount: 2,
        });

        expect(
            revokeAllUserAuthSessions,
        ).toHaveBeenCalledOnce();

        expect(
            createAuditLog,
        ).toHaveBeenCalledOnce();

        expect(
            console.error,
        ).toHaveBeenCalledOnce();
    });
});