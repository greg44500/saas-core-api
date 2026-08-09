import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { AUTH_SESSION_REVOKED_REASON } from '../../constants/authSession.constants.js';
import { AuthSession } from '../../modules/authSessions/authSession.model.js';

describe('AuthSession model', () => {
    const validSessionData = () => ({
        user: new mongoose.Types.ObjectId(),
        refreshTokenHash: 'a'.repeat(64),
        familyId: 'family-test-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: 'Mozilla/5.0 Test Browser',
        ipAddress: '127.0.0.1',
    });

    it('accepte une AuthSession valide', async () => {
        const session = new AuthSession(validSessionData());

        await expect(session.validate()).resolves.toBeUndefined();
    });

    it('refuse une AuthSession sans champ structurel obligatoire', async () => {
        const requiredFields = [
            'user',
            'refreshTokenHash',
            'familyId',
            'expiresAt',
        ];

        for (const field of requiredFields) {
            const data = validSessionData();

            delete data[field];

            const session = new AuthSession(data);

            await expect(session.validate()).rejects.toMatchObject({
                errors: expect.objectContaining({
                    [field]: expect.anything(),
                }),
            });
        }
    });

    it('impose la présence conjointe de revokedAt et revokedReason', async () => {
        const sessionWithoutReason = new AuthSession({
            ...validSessionData(),
            revokedAt: new Date(),
        });

        await expect(sessionWithoutReason.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                revokedReason: expect.anything(),
            }),
        });

        const sessionWithoutDate = new AuthSession({
            ...validSessionData(),
            revokedReason: AUTH_SESSION_REVOKED_REASON.LOGOUT,
        });

        await expect(sessionWithoutDate.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                revokedReason: expect.anything(),
            }),
        });
    });

    it('autorise replacedBySession uniquement pour une rotation de token', async () => {
        const session = new AuthSession({
            ...validSessionData(),
            revokedAt: new Date(),
            revokedReason: AUTH_SESSION_REVOKED_REASON.LOGOUT,
            replacedBySession: new mongoose.Types.ObjectId(),
        });

        await expect(session.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                replacedBySession: expect.anything(),
            }),
        });

        session.revokedReason = AUTH_SESSION_REVOKED_REASON.TOKEN_ROTATED;

        await expect(session.validate()).resolves.toBeUndefined();
    });

    it('autorise usedAt uniquement pour une rotation de token', async () => {
        const session = new AuthSession({
            ...validSessionData(),
            usedAt: new Date(),
            revokedAt: new Date(),
            revokedReason: AUTH_SESSION_REVOKED_REASON.LOGOUT,
        });

        await expect(session.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                usedAt: expect.anything(),
            }),
        });

        session.revokedReason = AUTH_SESSION_REVOKED_REASON.TOKEN_ROTATED;

        await expect(session.validate()).resolves.toBeUndefined();
    });
});