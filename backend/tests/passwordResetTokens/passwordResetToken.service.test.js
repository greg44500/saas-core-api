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
    revokePasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.service.js';
import { hashToken } from '../../utils/token.js';


vi.mock(
    '../../modules/passwordResetTokens/passwordResetToken.model.js',
    () => ({
        PasswordResetToken: {
            updateMany: vi.fn(),
            create: vi.fn(),
            updateOne: vi.fn(),
        },
    }),
);


describe('createPasswordResetToken', () => {
    const now =
        new Date('2026-09-12T08:00:00.000Z');

    const userId =
        new mongoose.Types.ObjectId();

    const session = {
        id: 'password-reset-test-session',
    };

    let transactionSpy;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
        vi.clearAllMocks();

        transactionSpy = vi
            .spyOn(
                mongoose.connection,
                'transaction',
            )
            .mockImplementation(
                async (callback) => {
                    return callback(session);
                },
            );

        PasswordResetToken.updateMany
            .mockResolvedValue({
                modifiedCount: 0,
            });

        PasswordResetToken.create
            .mockImplementation(
                async ([payload]) => [
                    {
                        _id: 'password-reset-token-id',
                        ...payload,
                    },
                ],
            );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });


    it('retourne le token brut sans jamais le persister', async () => {
        const result =
            await createPasswordResetToken({
                userId,
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
            });

        expect(result.resetToken).toMatch(
            /^[A-Za-z0-9_-]{43}$/,
        );

        const [
            [documents],
        ] = PasswordResetToken.create.mock.calls;

        const [createdDocument] = documents;

        expect(createdDocument.tokenHash).toBe(
            hashToken(result.resetToken),
        );

        expect(createdDocument)
            .not.toHaveProperty('resetToken');

        expect(createdDocument)
            .not.toHaveProperty('token');

        expect(
            Object.values(createdDocument),
        ).not.toContain(result.resetToken);
    });


    it('applique la durée de validité configurée au token', async () => {
        await createPasswordResetToken({
            userId,
        });

        const [
            [documents],
        ] = PasswordResetToken.create.mock.calls;

        const [createdDocument] = documents;

        const expectedExpiresAt =
            new Date(
                now.getTime()
                + env
                    .PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES
                * 60_000,
            );

        expect(
            createdDocument.expiresAt,
        ).toEqual(expectedExpiresAt);
    });


    it('révoque uniquement les anciens tokens encore actifs', async () => {
        await createPasswordResetToken({
            userId,
        });

        const [
            filter,
            update,
        ] = PasswordResetToken
            .updateMany
            .mock.calls[0];

        expect(filter.user).toBe(userId);
        expect(filter.usedAt).toBeNull();
        expect(filter.revokedAt).toBeNull();

        expect(
            filter.expiresAt.$gt,
        ).toEqual(now);

        expect(update).toEqual({
            $set: {
                revokedAt: now,
            },
        });
    });


    it('utilise la même session Mongo pour la révocation et la création', async () => {
        await createPasswordResetToken({
            userId,
        });

        const [
            ,
            ,
            updateOptions,
        ] = PasswordResetToken
            .updateMany
            .mock.calls[0];

        const [
            ,
            createOptions,
        ] = PasswordResetToken
            .create
            .mock.calls[0];

        expect(updateOptions.session)
            .toBe(session);

        expect(createOptions.session)
            .toBe(session);

        expect(transactionSpy)
            .toHaveBeenCalledTimes(1);
    });


    it("propage l'échec de création afin que la transaction puisse être annulée", async () => {
        const creationError =
            new Error(
                'password reset token creation failed',
            );

        PasswordResetToken.create
            .mockRejectedValue(
                creationError,
            );

        await expect(
            createPasswordResetToken({
                userId,
            }),
        ).rejects.toBe(creationError);

        expect(
            PasswordResetToken.updateMany,
        ).toHaveBeenCalledTimes(1);

        expect(transactionSpy)
            .toHaveBeenCalledTimes(1);
    });


    it('refuse la création sans utilisateur', async () => {
        await expect(
            createPasswordResetToken({
                userId: null,
            }),
        ).rejects.toThrow(
            'userId is required to create a password reset token',
        );

        expect(transactionSpy)
            .not.toHaveBeenCalled();

        expect(
            PasswordResetToken.create,
        ).not.toHaveBeenCalled();
    });
});

describe('revokePasswordResetToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        PasswordResetToken.updateOne
            .mockResolvedValue({
                modifiedCount: 1,
            });
    });


    it('révoque uniquement un token encore inutilisé', async () => {
        await revokePasswordResetToken({
            passwordResetTokenId:
                'password-reset-token-id',
        });

        expect(
            PasswordResetToken.updateOne,
        ).toHaveBeenCalledWith(
            {
                _id:
                    'password-reset-token-id',
                usedAt: null,
                revokedAt: null,
            },
            {
                $set: {
                    revokedAt:
                        expect.any(Date),
                },
            },
        );
    });


    it('refuse une révocation sans identifiant de token', async () => {
        await expect(
            revokePasswordResetToken({
                passwordResetTokenId: null,
            }),
        ).rejects.toThrow(
            'passwordResetTokenId is required to revoke a password reset token',
        );

        expect(
            PasswordResetToken.updateOne,
        ).not.toHaveBeenCalled();
    });
});