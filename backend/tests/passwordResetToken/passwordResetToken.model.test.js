import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    PasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.model.js';


describe('PasswordResetToken model', () => {
    const validTokenData = () => ({
        user: new mongoose.Types.ObjectId(),
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(
            Date.now() + 60 * 60 * 1000,
        ),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
    });

    it('accepte un PasswordResetToken valide', async () => {
        const passwordResetToken =
            new PasswordResetToken(validTokenData());

        await expect(
            passwordResetToken.validate(),
        ).resolves.toBeUndefined();
    });

    it('refuse un token sans champ structurel obligatoire', async () => {
        const requiredFields = [
            'user',
            'tokenHash',
            'expiresAt',
        ];

        for (const field of requiredFields) {
            const data = validTokenData();

            delete data[field];

            const passwordResetToken =
                new PasswordResetToken(data);

            await expect(
                passwordResetToken.validate(),
            ).rejects.toMatchObject({
                errors: expect.objectContaining({
                    [field]: expect.anything(),
                }),
            });
        }
    });

    it('refuse un hash qui ne correspond pas à une empreinte SHA-256 hexadécimale', async () => {
        const passwordResetToken =
            new PasswordResetToken({
                ...validTokenData(),
                tokenHash: 'invalid-token-hash',
            });

        await expect(
            passwordResetToken.validate(),
        ).rejects.toMatchObject({
            errors: expect.objectContaining({
                tokenHash: expect.anything(),
            }),
        });
    });

    it('protège le hash et définit les index critiques', () => {
        expect(
            PasswordResetToken.schema.path(
                'tokenHash',
            ).options.select,
        ).toBe(false);

        expect(
            PasswordResetToken.schema.indexes(),
        ).toEqual(
            expect.arrayContaining([
                [
                    { tokenHash: 1 },
                    expect.objectContaining({
                        unique: true,
                    }),
                ],
                [
                    { expiresAt: 1 },
                    expect.objectContaining({
                        expireAfterSeconds: 0,
                    }),
                ],
            ]),
        );
    });
});