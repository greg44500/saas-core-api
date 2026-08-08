import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';

describe('AuthIdentity model', () => {
    const userId = new mongoose.Types.ObjectId();

    it('accepts a valid local identity', async () => {
        const identity = new AuthIdentity({
            user: userId,
            provider: AUTH_PROVIDER.LOCAL,
            passwordHash: 'hashed-password',
        });

        await expect(identity.validate()).resolves.toBeUndefined();
    });

    it('accepts a valid Google identity', async () => {
        const identity = new AuthIdentity({
            user: userId,
            provider: AUTH_PROVIDER.GOOGLE,
            providerUserId: 'google-sub-123',
        });

        await expect(identity.validate()).resolves.toBeUndefined();
    });

    it('rejects an invalid local identity', async () => {
        const missingPasswordHash = new AuthIdentity({
            user: userId,
            provider: AUTH_PROVIDER.LOCAL,
        });

        const withProviderUserId = new AuthIdentity({
            user: userId,
            provider: AUTH_PROVIDER.LOCAL,
            passwordHash: 'hashed-password',
            providerUserId: 'unexpected-provider-id',
        });

        await expect(missingPasswordHash.validate()).rejects.toThrow();
        await expect(withProviderUserId.validate()).rejects.toThrow();
    });

    it('rejects an invalid Google identity', async () => {
        const missingProviderUserId = new AuthIdentity({
            user: userId,
            provider: AUTH_PROVIDER.GOOGLE,
        });

        const withPasswordHash = new AuthIdentity({
            user: userId,
            provider: AUTH_PROVIDER.GOOGLE,
            providerUserId: 'google-sub-123',
            passwordHash: 'unexpected-password-hash',
        });

        await expect(missingProviderUserId.validate()).rejects.toThrow();
        await expect(withPasswordHash.validate()).rejects.toThrow();
    });
});