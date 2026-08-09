import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import { registerUser } from '../../modules/auth/auth.service.js';
import { User } from '../../modules/users/user.model.js';
import { hashPassword } from '../../utils/password.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        exists: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        create: vi.fn(),
    },
}));

vi.mock('../../utils/password.js', () => ({
    hashPassword: vi.fn(),
}));

describe('registerUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('crée le User et son AuthIdentity local', async () => {
        const session = {};
        const user = {
            _id: 'user-id',
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'Greg@example.com',
            emailCanonical: 'greg@example.com',
        };

        User.exists.mockResolvedValue(null);
        hashPassword.mockResolvedValue('hashed-password');
        User.create.mockResolvedValue([user]);
        AuthIdentity.create.mockResolvedValue([{}]);

        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => {
                await callback(session);
            },
        );

        const result = await registerUser({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'Greg@example.com',
            password: 'une phrase de passe suffisamment longue',
        });

        expect(result).toBe(user);

        expect(User.create).toHaveBeenCalledWith(
            [
                {
                    firstName: 'Greg',
                    lastName: 'Ballat',
                    email: 'Greg@example.com',
                    emailCanonical: 'greg@example.com',
                },
            ],
            { session },
        );

        expect(AuthIdentity.create).toHaveBeenCalledWith(
            [
                {
                    user: 'user-id',
                    provider: AUTH_PROVIDER.LOCAL,
                    passwordHash: 'hashed-password',
                },
            ],
            { session },
        );
    });

    it('refuse une inscription si l’email existe déjà', async () => {
        User.exists.mockResolvedValue({ _id: 'existing-user-id' });

        await expect(
            registerUser({
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                password: 'une phrase de passe suffisamment longue',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'Un compte existe déjà avec cette adresse email',
        });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(User.create).not.toHaveBeenCalled();
        expect(AuthIdentity.create).not.toHaveBeenCalled();
    });
});