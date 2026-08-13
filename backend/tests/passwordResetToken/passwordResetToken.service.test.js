import mongoose from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { env } from '../../config/env.js';
import {
    PasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.model.js';
import {
    createPasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.service.js';
import { addMinutes } from '../../utils/date.js';
import {
    generatePasswordResetToken,
    hashToken,
} from '../../utils/token.js';


vi.mock(
    '../../modules/passwordResetTokens/passwordResetToken.model.js',
    () => ({
        PasswordResetToken: {
            create: vi.fn(),
            updateMany: vi.fn(),
        },
    }),
);

vi.mock('../../utils/date.js', () => ({
    addMinutes: vi.fn(),
}));

vi.mock('../../utils/token.js', () => ({
    generatePasswordResetToken: vi.fn(),
    hashToken: vi.fn(),
}));


describe('PasswordResetToken service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('révoque les demandes actives et crée un nouveau token dans une transaction', async () => {
        const session = {
            id: 'mongo-session',
        };

        const expiresAt =
            new Date('2026-08-13T12:30:00.000Z');

        const passwordResetToken = {
            _id: 'password-reset-token-id',
        };

        generatePasswordResetToken.mockReturnValue(
            'raw-reset-token',
        );

        hashToken.mockReturnValue(
            'a'.repeat(64),
        );

        addMinutes.mockReturnValue(expiresAt);

        PasswordResetToken.updateMany.mockResolvedValue({
            modifiedCount: 1,
        });

        PasswordResetToken.create.mockResolvedValue([
            passwordResetToken,
        ]);

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        const result =
            await createPasswordResetToken({
                userId: 'user-id',
                ipAddress: '127.0.0.1',
                userAgent: 'Test Browser',
            });

        expect(
            generatePasswordResetToken,
        ).toHaveBeenCalledOnce();

        expect(hashToken).toHaveBeenCalledWith(
            'raw-reset-token',
        );

        expect(addMinutes).toHaveBeenCalledWith(
            expect.any(Date),
            env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
        );

        const now = addMinutes.mock.calls[0][0];

        expect(
            PasswordResetToken.updateMany,
        ).toHaveBeenCalledWith(
            {
                user: 'user-id',
                usedAt: null,
                revokedAt: null,
                expiresAt: mongoose.trusted({
                    $gt: now,
                }),
            },
            {
                $set: {
                    revokedAt: now,
                },
            },
            {
                session,
            },
        );

        expect(
            PasswordResetToken.create,
        ).toHaveBeenCalledWith(
            [
                {
                    user: 'user-id',
                    tokenHash: 'a'.repeat(64),
                    expiresAt,
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Browser',
                },
            ],
            {
                session,
            },
        );

        expect(result).toEqual({
            passwordResetToken,
            resetToken: 'raw-reset-token',
        });
    });

    it('refuse de créer un token sans utilisateur', async () => {
        await expect(
            createPasswordResetToken({
                userId: null,
            }),
        ).rejects.toThrow(
            'userId is required to create a password reset token',
        );

        expect(
            generatePasswordResetToken,
        ).not.toHaveBeenCalled();

        expect(
            PasswordResetToken.create,
        ).not.toHaveBeenCalled();
    });
});