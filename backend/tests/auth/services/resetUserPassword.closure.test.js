import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    resetUserPassword,
} from '../../../modules/auth/services/resetUserPassword.service.js';
import {
    AuthIdentity,
} from '../../../modules/authIdentities/authIdentity.model.js';
import {
    PasswordResetToken,
} from '../../../modules/passwordResetTokens/passwordResetToken.model.js';
import { User } from '../../../modules/users/user.model.js';
import { sendEmail } from '../../../services/email.service.js';
import {
    hashPassword,
    verifyPassword,
} from '../../../utils/password.js';

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

vi.mock('../../../services/email.service.js', () => ({
    sendEmail: vi.fn(),
}));

vi.mock(
    '../../../services/emailTemplates/passwordChangedEmail.js',
    () => ({
        buildPasswordChangedEmail: vi.fn(),
    }),
);

describe('resetUserPassword — fermeture de compte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        PasswordResetToken.findOne.mockResolvedValue({
            _id: 'reset-token-id',
            user: 'user-id',
        });
    });

    it.each([
        'deletion_requested',
        'closed',
    ])(
        'refuse le reset lorsque le User est %s',
        async (status) => {
            User.findById.mockResolvedValue({
                _id: 'user-id',
                status,
            });

            await expect(
                resetUserPassword({
                    token: 'opaque-reset-token',
                    newPassword:
                        'nouveau mot de passe suffisamment long',
                }),
            ).rejects.toMatchObject({
                statusCode: 400,
                message:
                    'Lien de réinitialisation invalide ou expiré',
            });

            expect(AuthIdentity.findOne).not.toHaveBeenCalled();
            expect(User.updateOne).not.toHaveBeenCalled();
            expect(
                PasswordResetToken.findOneAndUpdate,
            ).not.toHaveBeenCalled();
        },
    );

    it('refuse atomiquement le reset si le compte engage sa fermeture avant l’écriture User', async () => {
        const session = { id: 'mongo-session' };

        User.findById.mockResolvedValue({
            _id: 'user-id',
            email: 'greg@example.com',
            status: 'active',
        });
        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash: 'stored-password-hash',
            }),
        });
        verifyPassword.mockResolvedValue(false);
        hashPassword.mockResolvedValue('new-password-hash');
        PasswordResetToken.findOneAndUpdate.mockResolvedValue({
            _id: 'reset-token-id',
            user: 'user-id',
            usedAt: new Date(),
        });
        AuthIdentity.updateOne.mockResolvedValue({
            modifiedCount: 1,
        });
        User.updateOne.mockResolvedValue({
            matchedCount: 0,
        });

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        await expect(
            resetUserPassword({
                token: 'opaque-reset-token',
                newPassword:
                    'nouveau mot de passe suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message:
                'Lien de réinitialisation invalide ou expiré',
        });

        expect(User.updateOne).toHaveBeenCalledOnce();
        const [userFilter] = User.updateOne.mock.calls[0];
        expect(userFilter.status.$in).toEqual([
            'active',
            'disabled',
        ]);
        expect(sendEmail).not.toHaveBeenCalled();
    });
});
