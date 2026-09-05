import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    forgotUserPassword,
} from '../../modules/auth/services/forgotUserPassword.service.js';
import {
    AuthIdentity,
} from '../../modules/authIdentities/authIdentity.model.js';
import {
    createPasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.service.js';
import { User } from '../../modules/users/user.model.js';
import { sendEmail } from '../../services/email.service.js';
import { ensureMinimumDuration } from '../../utils/securityTiming.js';

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        exists: vi.fn(),
    },
}));

vi.mock('../../modules/passwordResetTokens/passwordResetToken.service.js', () => ({
    createPasswordResetToken: vi.fn(),
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../services/email.service.js', () => ({
    sendEmail: vi.fn(),
}));

vi.mock('../../utils/securityTiming.js', () => ({
    ensureMinimumDuration: vi.fn(),
}));

describe('forgotUserPassword — fermeture de compte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ensureMinimumDuration.mockResolvedValue(undefined);
        AuthIdentity.exists.mockResolvedValue(true);
    });

    it.each([
        'deletion_requested',
        'closed',
    ])(
        'reste neutre et ne crée aucun reset token lorsque le User est %s',
        async (status) => {
            User.findOne.mockResolvedValue({
                _id: 'user-id',
                email: 'greg@example.com',
                status,
            });

            const result = await forgotUserPassword({
                email: 'greg@example.com',
            });

            expect(result).toEqual({
                message:
                    'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
            });
            expect(createPasswordResetToken).not.toHaveBeenCalled();
            expect(sendEmail).not.toHaveBeenCalled();
            expect(ensureMinimumDuration).toHaveBeenCalledOnce();
        },
    );
});
