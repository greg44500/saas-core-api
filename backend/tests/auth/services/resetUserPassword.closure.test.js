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
});
