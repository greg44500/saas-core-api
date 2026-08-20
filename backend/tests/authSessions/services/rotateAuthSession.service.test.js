import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';


import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';
import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';
import {
    AuthSession,
} from '../../../modules/authSessions/authSession.model.js';
import {
    rotateAuthSession,
} from '../../../modules/authSessions/authSession.service.js';


vi.mock('mongoose', async () => {
    const actual =
        await vi.importActual('mongoose');

    return {
        ...actual,
        default: {
            ...actual.default,
            Types: actual.default.Types,
            connection: {
                transaction: vi.fn(),
            },
        },
    };
});

vi.mock('../../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../../modules/authSessions/authSession.model.js', () => ({
    AuthSession: {
        create: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
        updateMany: vi.fn(),
    },
}));

vi.mock('../../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
    },
}));


function createReusedAuthSession() {
    return {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        familyId: 'family-id',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
        revokedAt: new Date(),
        revokedReason:
            AUTH_SESSION_REVOKED_REASON
                .TOKEN_ROTATED,
        replacedBySession:
            new mongoose.Types.ObjectId(),
        compromisedAt: null,
    };
}


describe('rotateAuthSession audit', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mongoose.connection.transaction
            .mockImplementation(
                async (callback) =>
                    callback({
                        id: 'mongo-session',
                    }),
            );

        AuthSession.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });

        createAuditLog.mockResolvedValue(undefined);
    });


    it('audite la réutilisation après la compromission de la famille', async () => {
        const currentAuthSession =
            createReusedAuthSession();

        AuthSession.findOne.mockResolvedValue(
            currentAuthSession,
        );

        await expect(
            rotateAuthSession({
                refreshToken:
                    'already-used-refresh-token',
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
        });

        expect(
            AuthSession.updateMany,
        ).toHaveBeenCalledTimes(2);

        expect(createAuditLog).toHaveBeenCalledWith({
            actor: null,
            action:
                AUDIT_ACTION
                    .SESSION_REUSE_DETECTED,
            entityType:
                AUDIT_ENTITY_TYPE.AUTH_SESSION,
            entityId: currentAuthSession._id,
            status: AUDIT_STATUS.FAILED,
            ipAddress: '127.0.0.1',
            userAgent:
                'Mozilla/5.0 Test Browser',
            metadata: {
                revokedReason:
                    AUTH_SESSION_REVOKED_REASON
                        .TOKEN_REUSE_DETECTED,
            },
        });

        const [auditData] =
            createAuditLog.mock.calls[0];

        expect(auditData).not.toHaveProperty(
            'refreshToken',
        );

        expect(auditData).not.toHaveProperty(
            'refreshTokenHash',
        );
    });


    it('conserve la compromission si l’audit échoue', async () => {
        AuthSession.findOne.mockResolvedValue(
            createReusedAuthSession(),
        );

        createAuditLog.mockRejectedValue(
            new Error('AuditLog unavailable'),
        );

        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        await expect(
            rotateAuthSession({
                refreshToken:
                    'already-used-refresh-token',
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
        });

        expect(
            AuthSession.updateMany,
        ).toHaveBeenCalledTimes(2);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Auth session audit log creation failed',
            {
                action:
                    AUDIT_ACTION
                        .SESSION_REUSE_DETECTED,
                errorName: 'Error',
            },
        );

        consoleErrorSpy.mockRestore();
    });
});