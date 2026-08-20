import mongoose from 'mongoose';
import {
    afterEach,
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
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';
import {
    AuthIdentity,
} from '../../../modules/authIdentities/authIdentity.model.js';
import {
    resetUserPassword,
} from '../../../modules/auth/services/resetUserPassword.service.js';
import {
    revokeAllUserAuthSessions,
} from '../../../modules/authSessions/authSession.service.js';
import {
    PasswordResetToken,
} from '../../../modules/passwordResetTokens/passwordResetToken.model.js';
import {
    User,
} from '../../../modules/users/user.model.js';
import {
    hashPassword,
    verifyPassword,
} from '../../../utils/password.js';
import {
    buildPasswordChangedEmail,
} from '../../../services/emailTemplates/passwordChangedEmail.js';
import {
    sendEmail,
} from '../../../services/email.service.js';


vi.mock('../../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        findOne: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../../modules/authSessions/authSession.service.js', () => ({
    revokeAllUserAuthSessions: vi.fn(),
}));

vi.mock(
    '../../../modules/passwordResetTokens/passwordResetToken.model.js',
    () => ({
        PasswordResetToken: {
            findOne: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);

vi.mock('../../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../../utils/password.js', () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
}));

vi.mock(
    '../../../services/emailTemplates/passwordChangedEmail.js',
    () => ({
        buildPasswordChangedEmail: vi.fn(),
    }),
);

vi.mock('../../../services/email.service.js', () => ({
    sendEmail: vi.fn(),
}));


function prepareSuccessfulReset() {
    const session = {
        id: 'mongo-session',
    };

    const passwordResetToken = {
        _id: 'password-reset-token-id',
        user: 'user-id',
        expiresAt: new Date(
            Date.now() + 30 * 60 * 1000,
        ),
    };

    const user = {
        _id: 'user-id',
        email: 'greg@example.com',
        status: 'active',
    };

    PasswordResetToken.findOne.mockResolvedValue(
        passwordResetToken,
    );

    User.findById.mockResolvedValue(user);

    AuthIdentity.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue({
            _id: 'identity-id',
            passwordHash: 'stored-password-hash',
        }),
    });

    verifyPassword.mockResolvedValue(false);
    hashPassword.mockResolvedValue(
        'new-password-hash',
    );

    PasswordResetToken.findOneAndUpdate
        .mockResolvedValue({
            ...passwordResetToken,
            usedAt: new Date(),
        });

    AuthIdentity.updateOne.mockResolvedValue({
        modifiedCount: 1,
    });

    User.updateOne.mockResolvedValue({
        matchedCount: 1,
    });

    revokeAllUserAuthSessions.mockResolvedValue({
        modifiedCount: 2,
    });

    vi.spyOn(
        mongoose.connection,
        'transaction',
    ).mockImplementation(
        async (callback) => callback(session),
    );

    buildPasswordChangedEmail.mockReturnValue({
        subject: 'Mot de passe modifié',
        text: 'Notification texte',
        html: '<p>Notification HTML</p>',
    });

    sendEmail.mockResolvedValue({
        messageId: 'message-id',
    });

    return {
        session,
        user,
    };
}


describe('resetUserPassword audit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createAuditLog.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });


    it('audite le reset réussi dans la transaction', async () => {
        const {
            session,
            user,
        } = prepareSuccessfulReset();

        await resetUserPassword({
            token: 'opaque-reset-token',
            newPassword:
                'nouveau mot de passe suffisamment long',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: null,
                action:
                    AUDIT_ACTION
                        .PASSWORD_RESET_COMPLETED,
                entityType:
                    AUDIT_ENTITY_TYPE.USER,
                entityId: user._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
                metadata: {
                    provider: AUTH_PROVIDER.LOCAL,
                    revokedSessionCount: 2,
                },
            },
            {
                session,
            },
        );

        const [auditData] =
            createAuditLog.mock.calls[0];

        expect(auditData).not.toHaveProperty('token');
        expect(auditData).not.toHaveProperty('tokenHash');
        expect(auditData).not.toHaveProperty('email');
        expect(auditData).not.toHaveProperty('password');
        expect(auditData).not.toHaveProperty('passwordHash');
    });


    it('propage l’échec de l’audit et n’envoie pas l’email', async () => {
        prepareSuccessfulReset();

        const auditError = new Error(
            'AuditLog persistence failed',
        );

        createAuditLog.mockRejectedValue(
            auditError,
        );

        await expect(
            resetUserPassword({
                token: 'opaque-reset-token',
                newPassword:
                    'nouveau mot de passe suffisamment long',
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            }),
        ).rejects.toBe(auditError);

        expect(
            buildPasswordChangedEmail,
        ).not.toHaveBeenCalled();

        expect(sendEmail).not.toHaveBeenCalled();
    });
});