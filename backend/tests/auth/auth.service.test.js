import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import { loginUser, registerUser, changeUserPassword, forgotUserPassword, } from '../../modules/auth/auth.service.js';
import {
    createInitialAuthSession, revokeAllUserAuthSessions,
} from '../../modules/authSessions/authSession.service.js';
import { User } from '../../modules/users/user.model.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { sendEmail } from '../../services/email.service.js';

import {
    buildPasswordResetEmail,
} from '../../services/emailTemplates/passwordResetEmail.js';

import {
    buildPasswordResetUrl,
} from '../../modules/auth/passwordResetUrl.js';

import {
    createPasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.service.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        exists: vi.fn(),
        create: vi.fn(),
        findOne: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        create: vi.fn(),
        exists: vi.fn(),
        findOne: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
    createInitialAuthSession: vi.fn(),
    revokeAllUserAuthSessions: vi.fn(),
}));

vi.mock('../../utils/password.js', () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
}));

vi.mock('../../modules/passwordResetTokens/passwordResetToken.service.js', () => ({
    createPasswordResetToken: vi.fn(),
}));

vi.mock('../../modules/auth/passwordResetUrl.js', () => ({
    buildPasswordResetUrl: vi.fn(),
}));

vi.mock('../../services/emailTemplates/passwordResetEmail.js', () => ({
    buildPasswordResetEmail: vi.fn(),
}));

vi.mock('../../services/email.service.js', () => ({
    sendEmail: vi.fn(),
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

describe('changeUserPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('modifie le hash et révoque les sessions dans une transaction', async () => {
        const session = {
            id: 'mongo-session',
        };

        const authIdentity = {
            _id: 'identity-id',
            passwordHash: 'stored-password-hash',
        };

        const select = vi.fn().mockResolvedValue(
            authIdentity,
        );

        AuthIdentity.findOne.mockReturnValue({
            select,
        });

        verifyPassword
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        hashPassword.mockResolvedValue(
            'new-password-hash',
        );

        AuthIdentity.updateOne.mockResolvedValue({
            modifiedCount: 1,
        });

        User.updateOne.mockResolvedValue({
            matchedCount: 1,
        });

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        const result = await changeUserPassword({
            userId: 'user-id',
            currentPassword:
                'mot de passe actuel suffisamment long',
            newPassword:
                'nouveau mot de passe suffisamment long',
        });

        expect(
            AuthIdentity.updateOne,
        ).toHaveBeenCalledWith(
            {
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            },
            {
                $set: {
                    passwordHash:
                        'new-password-hash',
                },
            },
            {
                session,
            },
        );

        expect(User.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: 'user-id',
            }),
            {
                $set: {
                    passwordChangedAt:
                        expect.any(Date),
                    updatedBy: 'user-id',
                },
            },
            {
                session,
            },
        );

        expect(
            revokeAllUserAuthSessions,
        ).toHaveBeenCalledWith({
            userId: 'user-id',
            revokedReason:
                AUTH_SESSION_REVOKED_REASON
                    .PASSWORD_CHANGED,
            session,
        });

        expect(result).toEqual({
            passwordChangedAt:
                expect.any(Date),
        });
    });

    it('refuse un mot de passe actuel incorrect', async () => {
        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(false);

        await expect(
            changeUserPassword({
                userId: 'user-id',
                currentPassword:
                    'mot de passe actuel incorrect',
                newPassword:
                    'nouveau mot de passe suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
            message:
                'Mot de passe actuel invalide',
        });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(
            AuthIdentity.updateOne,
        ).not.toHaveBeenCalled();
        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });

    it('refuse de réutiliser le mot de passe actuel', async () => {
        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            }),
        });

        verifyPassword
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true);

        await expect(
            changeUserPassword({
                userId: 'user-id',
                currentPassword:
                    'mot de passe actuel suffisamment long',
                newPassword:
                    'mot de passe actuel suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message:
                'Le nouveau mot de passe doit être différent',
        });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(
            AuthIdentity.updateOne,
        ).not.toHaveBeenCalled();
    });
});

describe('forgotUserPassword', () => {
    beforeEach(() => {
        /*
         * Chaque test doit partir d'un état propre.
         *
         * forgotUserPassword orchestre plusieurs dépendances mockées :
         * conserver l'historique d'appels d'un test précédent pourrait
         * produire de faux positifs dans les assertions de sécurité.
         */
        vi.clearAllMocks();
    });

    it('crée un token et envoie l’email pour un compte local existant', async () => {
        const user = {
            _id: 'user-id',
            email: 'Greg@example.com',
            status: 'active',
        };

        User.findOne.mockResolvedValue(user);

        /*
         * AuthIdentity.exists() confirme ici que le compte possède
         * effectivement une identité locale avec mot de passe.
         */
        AuthIdentity.exists.mockResolvedValue({
            _id: 'identity-id',
        });

        /*
         * Le service spécialisé retourne le token brut uniquement
         * pour permettre son transport vers l'utilisateur.
         * Sa persistance sous forme hashée est testée ailleurs.
         */
        createPasswordResetToken.mockResolvedValue({
            passwordResetToken: {
                _id: 'password-reset-token-id',
            },
            resetToken: 'opaque-reset-token',
        });

        buildPasswordResetUrl.mockReturnValue(
            'http://localhost:5173/reset-password?token=opaque-reset-token',
        );

        buildPasswordResetEmail.mockReturnValue({
            subject: 'Réinitialisation de votre mot de passe',
            text: 'Version texte du message',
            html: '<p>Version HTML du message</p>',
        });

        sendEmail.mockResolvedValue({
            messageId: 'message-id',
        });

        const result = await forgotUserPassword({
            email: 'Greg@Example.com',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        /*
         * L'adresse est canonisée avant toute recherche afin que
         * forgot-password utilise exactement la même stratégie
         * d'identification que register et login.
         */
        expect(User.findOne).toHaveBeenCalledWith({
            emailCanonical: 'greg@example.com',
        });

        expect(AuthIdentity.exists).toHaveBeenCalledWith({
            user: 'user-id',
            provider: AUTH_PROVIDER.LOCAL,
        });

        expect(
            createPasswordResetToken,
        ).toHaveBeenCalledWith({
            userId: 'user-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        /*
         * Seul le token brut est transmis à la construction de l'URL.
         * Aucun hash ou document MongoDB n'a à être exposé à cette couche.
         */
        expect(
            buildPasswordResetUrl,
        ).toHaveBeenCalledWith({
            token: 'opaque-reset-token',
        });

        expect(
            buildPasswordResetEmail,
        ).toHaveBeenCalledWith({
            resetUrl:
                'http://localhost:5173/reset-password?token=opaque-reset-token',
            expiresInMinutes: 30,
        });

        expect(sendEmail).toHaveBeenCalledWith({
            to: 'Greg@example.com',
            subject:
                'Réinitialisation de votre mot de passe',
            text: 'Version texte du message',
            html: '<p>Version HTML du message</p>',
        });

        /*
         * La réponse publique ne contient aucune information sur
         * le User, le token ou le résultat détaillé du transport SMTP.
         */
        expect(result).toEqual({
            message:
                'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
        });
    });

    it('renvoie la réponse générique si l’adresse email n’existe pas', async () => {
        User.findOne.mockResolvedValue(null);

        const result = await forgotUserPassword({
            email: 'unknown@example.com',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        /*
         * L'absence du compte ne doit déclencher aucune création de token
         * ni aucun email, mais elle ne doit pas être révélée à l'appelant.
         */
        expect(
            AuthIdentity.exists,
        ).not.toHaveBeenCalled();

        expect(
            createPasswordResetToken,
        ).not.toHaveBeenCalled();

        expect(
            buildPasswordResetUrl,
        ).not.toHaveBeenCalled();

        expect(
            buildPasswordResetEmail,
        ).not.toHaveBeenCalled();

        expect(sendEmail).not.toHaveBeenCalled();

        expect(result).toEqual({
            message:
                'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
        });
    });

    it('renvoie la réponse générique pour un compte sans identité locale', async () => {
        const user = {
            _id: 'user-id',
            email: 'greg@example.com',
            status: 'active',
        };

        User.findOne.mockResolvedValue(user);

        /*
         * Un compte authentifié uniquement par Google, par exemple,
         * ne doit pas recevoir un token de reset du credential local.
         */
        AuthIdentity.exists.mockResolvedValue(null);

        const result = await forgotUserPassword({
            email: 'greg@example.com',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        expect(
            createPasswordResetToken,
        ).not.toHaveBeenCalled();

        expect(
            buildPasswordResetUrl,
        ).not.toHaveBeenCalled();

        expect(
            buildPasswordResetEmail,
        ).not.toHaveBeenCalled();

        expect(sendEmail).not.toHaveBeenCalled();

        /*
         * La réponse reste strictement identique à celle d'une adresse
         * inexistante afin de ne pas exposer le fournisseur d'authentification.
         */
        expect(result).toEqual({
            message:
                'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
        });
    });

    it('renvoie la réponse générique pour un compte clôturé', async () => {
        const user = {
            _id: 'user-id',
            email: 'greg@example.com',
            status: 'closed',
        };

        User.findOne.mockResolvedValue(user);

        AuthIdentity.exists.mockResolvedValue({
            _id: 'identity-id',
        });

        const result = await forgotUserPassword({
            email: 'greg@example.com',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        /*
         * Un compte CLOSED ne doit plus pouvoir initier un nouveau
         * processus permettant de modifier ses credentials.
         */
        expect(
            createPasswordResetToken,
        ).not.toHaveBeenCalled();

        expect(
            buildPasswordResetUrl,
            
        ).not.toHaveBeenCalled();

        expect(
            buildPasswordResetEmail,
        ).not.toHaveBeenCalled();

        expect(sendEmail).not.toHaveBeenCalled();

        /*
         * Le statut CLOSED ne doit surtout pas être révélé par
         * la réponse de forgot-password.
         */
        expect(result).toEqual({
            message:
                'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
        });
    });
});