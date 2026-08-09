import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import { loginUser, registerUser } from '../../modules/auth/auth.service.js';
import { createInitialAuthSession } from '../../modules/authSessions/authSession.service.js';
import { User } from '../../modules/users/user.model.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        exists: vi.fn(),
        create: vi.fn(),
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        create: vi.fn(),
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
    createInitialAuthSession: vi.fn(),
}));

vi.mock('../../utils/password.js', () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
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
        User.exists.mockResolvedValue({
            _id: 'existing-user-id',
        });

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

describe('loginUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('authentifie un utilisateur et crée son AuthSession', async () => {
        const user = {
            _id: 'user-id',
            status: 'active',
            lastLoginAt: null,
            save: vi.fn().mockResolvedValue(undefined),
        };

        const authIdentity = {
            passwordHash: 'stored-password-hash',
        };

        const select = vi.fn().mockResolvedValue(authIdentity);

        User.findOne.mockResolvedValue(user);

        AuthIdentity.findOne.mockReturnValue({
            select,
        });

        verifyPassword.mockResolvedValue(true);

        createInitialAuthSession.mockResolvedValue({
            authSession: {
                _id: 'session-id',
            },
            refreshToken: 'refresh-token-test',
        });

        const result = await loginUser({
            email: 'Greg@Example.com',
            password: 'une phrase de passe suffisamment longue',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        expect(User.findOne).toHaveBeenCalledWith({
            emailCanonical: 'greg@example.com',
        });

        expect(AuthIdentity.findOne).toHaveBeenCalledWith({
            user: 'user-id',
            provider: AUTH_PROVIDER.LOCAL,
        });

        expect(select).toHaveBeenCalledWith('+passwordHash');

        expect(verifyPassword).toHaveBeenCalledWith(
            'une phrase de passe suffisamment longue',
            'stored-password-hash',
        );

        expect(createInitialAuthSession).toHaveBeenCalledWith({
            userId: 'user-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        expect(user.lastLoginAt).toBeInstanceOf(Date);
        expect(user.save).toHaveBeenCalled();

        expect(result).toEqual({
            user,
            refreshToken: 'refresh-token-test',
        });
    });

    it('refuse des credentials invalides', async () => {
        const user = {
            _id: 'user-id',
            status: 'active',
        };

        User.findOne.mockResolvedValue(user);

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                passwordHash: 'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(false);

        await expect(
            loginUser({
                email: 'greg@example.com',
                password: 'mauvais mot de passe suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Identifiants invalides',
        });

        // Une session ne doit surtout pas être créée
        // lorsque les credentials sont invalides.
        expect(createInitialAuthSession).not.toHaveBeenCalled();
    });

    it('refuse la connexion d’un compte désactivé', async () => {
        const user = {
            _id: 'user-id',
            status: 'disabled',
        };

        User.findOne.mockResolvedValue(user);

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                passwordHash: 'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(true);

        await expect(
            loginUser({
                email: 'greg@example.com',
                password: 'une phrase de passe suffisamment longue',
            }),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Compte désactivé',
        });

        // Le statut du compte est contrôlé avant toute création de session.
        expect(createInitialAuthSession).not.toHaveBeenCalled();
    });
});