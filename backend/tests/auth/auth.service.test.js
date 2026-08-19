import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    USER_STATUS,
} from '../../constants/userStatus.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';
import {
    ensureMinimumDuration,
} from '../../utils/securityTiming.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import {
    loginUser,
    registerUser,
    changeUserPassword,
    forgotUserPassword,
    resetUserPassword,
} from '../../modules/auth/auth.service.js';
import {
    PasswordResetToken,
} from '../../modules/passwordResetTokens/passwordResetToken.model.js';
import { hashToken } from '../../utils/token.js';
import {
    createInitialAuthSession, revokeAllUserAuthSessions,
} from '../../modules/authSessions/authSession.service.js';
import { User } from '../../modules/users/user.model.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { sendEmail } from '../../services/email.service.js';

import {
    buildPasswordResetEmail,
} from '../../services/emailTemplates/passwordResetEmail.js';

import { buildPasswordChangedEmail } from '../../services/emailTemplates/passwordChangedEmail.js';

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
        findById: vi.fn(),
        findOne: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        create: vi.fn(),
        exists: vi.fn(),
        findOne: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock(
    '../../modules/passwordResetTokens/passwordResetToken.model.js',
    () => ({
        PasswordResetToken: {
            findOne: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);

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

vi.mock('../../services/emailTemplates/passwordChangedEmail.js', () => ({
    buildPasswordChangedEmail: vi.fn(),
}));

vi.mock('../../services/email.service.js', () => ({
    sendEmail: vi.fn(),
}));

vi.mock('../../utils/securityTiming.js', () => ({
    ensureMinimumDuration: vi
        .fn()
        .mockResolvedValue({
            elapsedMs: 0,
            targetDurationMs: 700,
            waitedMs: 700,
        }),
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
        createAuditLog.mockResolvedValue(undefined);
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

        expect(createAuditLog).toHaveBeenCalledWith({
            actor: 'user-id',
            action: AUDIT_ACTION.LOGIN_SUCCESS,
            entityType: AUDIT_ENTITY_TYPE.AUTH_SESSION,
            entityId: 'session-id',
            status: AUDIT_STATUS.SUCCESS,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
            metadata: {
                provider: AUTH_PROVIDER.LOCAL,
            },
        });

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
                password:
                    'une phrase de passe suffisamment longue',
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0 Test Browser',
            }),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Compte désactivé',
        });

        /*
         * Les credentials sont valides, mais l'état du compte interdit
         * la connexion. Aucune session ne doit donc être créée.
         */
        expect(
            createInitialAuthSession,
        ).not.toHaveBeenCalled();

        /*
         * actor reste null car aucune authentification n'a abouti.
         *
         * Le compte connu est uniquement enregistré comme ressource
         * ciblée par la tentative de connexion.
         */
        expect(createAuditLog).toHaveBeenCalledWith({
            actor: null,
            action: AUDIT_ACTION.LOGIN_FAILED,
            entityType: AUDIT_ENTITY_TYPE.USER,
            entityId: 'user-id',
            status: AUDIT_STATUS.FAILED,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
            metadata: {
                provider: AUTH_PROVIDER.LOCAL,
                reasonCode: 'account_disabled',
            },
        });
    });

    it('audite sans acteur une tentative visant un email inconnu', async () => {
        User.findOne.mockResolvedValue(null);

        await expect(
            loginUser({
                email: 'unknown@example.com',
                password:
                    'mot de passe invalide suffisamment long',
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0 Test Browser',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Identifiants invalides',
        });

        expect(AuthIdentity.findOne).not.toHaveBeenCalled();
        expect(verifyPassword).not.toHaveBeenCalled();
        expect(createInitialAuthSession).not.toHaveBeenCalled();

        expect(createAuditLog).toHaveBeenCalledWith({
            actor: null,
            action: AUDIT_ACTION.LOGIN_FAILED,
            entityType: null,
            entityId: null,
            status: AUDIT_STATUS.FAILED,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
            metadata: {
                provider: AUTH_PROVIDER.LOCAL,
                reasonCode: 'invalid_credentials',
            },
        });

        const auditData = createAuditLog.mock.calls[0][0];

        expect(auditData.metadata.email).toBeUndefined();
        expect(auditData.metadata.password).toBeUndefined();
    });


    it('maintient le login réussi si son audit échoue', async () => {
        const user = {
            _id: 'user-id',
            status: USER_STATUS.ACTIVE,
            lastLoginAt: null,
            save: vi.fn().mockResolvedValue(undefined),
        };

        User.findOne.mockResolvedValue(user);

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                passwordHash: 'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(true);

        createInitialAuthSession.mockResolvedValue({
            authSession: {
                _id: 'session-id',
            },
            refreshToken: 'refresh-token-test',
        });

        createAuditLog.mockRejectedValueOnce(
            new Error('MongoDB audit write failed'),
        );

        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        const result = await loginUser({
            email: 'greg@example.com',
            password:
                'une phrase de passe suffisamment longue',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        });

        expect(result).toEqual({
            user,
            refreshToken: 'refresh-token-test',
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Authentication audit log creation failed',
            {
                action: AUDIT_ACTION.LOGIN_SUCCESS,
                errorName: 'Error',
            },
        );

        consoleErrorSpy.mockRestore();
    });
});

describe('changeUserPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createAuditLog.mockResolvedValue(undefined);
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

        revokeAllUserAuthSessions.mockResolvedValue({
            acknowledged: true,
            matchedCount: 2,
            modifiedCount: 2,
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
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
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
        /*
         * Le même objet session prouve que l'audit appartient à la transaction
         * qui modifie le credential et révoque les sessions.
         */
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: 'user-id',
                action: AUDIT_ACTION.PASSWORD_CHANGED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: 'user-id',
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0 Test Browser',
                metadata: {
                    changeMethod: 'authenticated',
                    revokedSessionCount: 2,
                },
            },
            {
                session,
            },
        );
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
         * AuthIdentity.exists() confirme que le compte possède
         * effectivement une identité locale avec mot de passe.
         */
        AuthIdentity.exists.mockResolvedValue({
            _id: 'identity-id',
        });

        /*
         * Le service spécialisé retourne le token brut uniquement
         * pour permettre son transport vers l'utilisateur.
         *
         * Sa persistance sous forme hashée est testée
         * dans passwordResetToken.service.test.js.
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
            subject:
                'Réinitialisation de votre mot de passe',
            text:
                'Version texte du message',
            html:
                '<p>Version HTML du message</p>',
        });

        sendEmail.mockResolvedValue({
            messageId: 'message-id',
        });

        const result =
            await forgotUserPassword({
                email: 'Greg@Example.com',
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            });

        /*
         * L'adresse est canonisée avant toute recherche afin que
         * forgot-password utilise exactement la même stratégie
         * d'identification que register et login.
         */
        expect(
            User.findOne,
        ).toHaveBeenCalledWith({
            emailCanonical:
                'greg@example.com',
        });

        /*
         * Le workflow de reset ne doit être disponible
         * que pour une identité locale.
         */
        expect(
            AuthIdentity.exists,
        ).toHaveBeenCalledWith({
            user: 'user-id',
            provider: AUTH_PROVIDER.LOCAL,
        });

        /*
         * Les informations techniques de contexte sont transmises
         * au service responsable du PasswordResetToken.
         */
        expect(
            createPasswordResetToken,
        ).toHaveBeenCalledWith({
            userId: 'user-id',
            ipAddress: '127.0.0.1',
            userAgent:
                'Mozilla/5.0 Test Browser',
        });

        /*
         * Seul le token brut est transmis au générateur d'URL.
         *
         * Aucun hash ni document MongoDB ne doit être exposé
         * à cette couche.
         */
        expect(
            buildPasswordResetUrl,
        ).toHaveBeenCalledWith({
            token: 'opaque-reset-token',
        });

        /*
         * Le template reçoit uniquement les informations
         * nécessaires à la présentation de l'email.
         */
        expect(
            buildPasswordResetEmail,
        ).toHaveBeenCalledWith({
            resetUrl:
                'http://localhost:5173/reset-password?token=opaque-reset-token',
            expiresInMinutes: 30,
        });

        /*
         * Le service Auth délègue le transport effectif
         * à email.service.js.
         */
        expect(
            sendEmail,
        ).toHaveBeenCalledWith({
            to: 'Greg@example.com',
            subject:
                'Réinitialisation de votre mot de passe',
            text:
                'Version texte du message',
            html:
                '<p>Version HTML du message</p>',
        });

        /*
         * Même le chemin nominal doit passer par la compensation
         * temporelle commune.
         *
         * Cela évite qu'un compte existant puisse être distingué
         * uniquement par la durée du workflow.
         */
        expect(
            ensureMinimumDuration,
        ).toHaveBeenCalledWith({
            startedAt: expect.any(Number),
            minimumMs: 700,
            jitterMs: 150,
        });

        /*
         * La réponse publique reste volontairement générique.
         *
         * Elle ne doit contenir ni User, ni token,
         * ni information détaillée sur SMTP.
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
    /*
* Un compte CLOSED doit lui aussi passer par la sortie temporelle
* commune afin que ce statut ne puisse pas être déduit
* d'un temps de réponse plus court.
*/
    expect(
        ensureMinimumDuration,
    ).toHaveBeenCalledWith({
        startedAt: expect.any(Number),
        minimumMs: 700,
        jitterMs: 150,
    });
});

describe('resetUserPassword', () => {
    beforeEach(() => {
        /*
         * resetUserPassword orchestre plusieurs écritures sensibles.
         * Chaque test doit donc repartir sans historique d'appels
         * provenant d'un scénario précédent.
         */
        vi.clearAllMocks();
    });

    it('réinitialise le mot de passe et révoque les sessions dans une transaction', async () => {
        const session = {
            id: 'mongo-session',
        };

        const rawResetToken =
            'opaque-reset-token';

        const expectedTokenHash =
            hashToken(rawResetToken);

        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        const user = {
            _id: 'user-id',
            email: 'greg@example.com',
            status: 'active',
        };

        const authIdentity = {
            _id: 'identity-id',
            passwordHash:
                'stored-password-hash',
        };

        /*
         * Première lecture du token hors transaction.
         * Le service prépare ainsi l'opération avant le calcul Argon2id.
         */
        PasswordResetToken.findOne.mockResolvedValue(
            passwordResetToken,
        );

        User.findById.mockResolvedValue(user);

        AuthIdentity.findOne.mockReturnValue({
            select: vi
                .fn()
                .mockResolvedValue(
                    authIdentity,
                ),
        });

        /*
         * false signifie que le nouveau mot de passe
         * est différent du mot de passe actuellement enregistré.
         */
        verifyPassword.mockResolvedValue(false);

        hashPassword.mockResolvedValue(
            'new-password-hash',
        );

        /*
         * La consommation définitive du token réussit.
         *
         * Une valeur non null signifie que le token satisfaisait encore
         * toutes les conditions au moment de l'écriture transactionnelle.
         */
        PasswordResetToken.findOneAndUpdate
            .mockResolvedValue({
                ...passwordResetToken,
                usedAt: new Date(),
            });

        AuthIdentity.updateOne.mockResolvedValue({
            modifiedCount: 1,
        });

        User.updateOne.mockResolvedValue({
            matchedCount: 1,
        });

        revokeAllUserAuthSessions.mockResolvedValue({
            modifiedCount: 2,
        });

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => {
                const transactionResult =
                    await callback(session);

                /*
                 * L'envoi SMTP ne doit jamais avoir lieu tant que
                 * la transaction MongoDB est encore en cours.
                 */
                expect(
                    sendEmail,
                ).not.toHaveBeenCalled();

                return transactionResult;
            },
        );
        buildPasswordChangedEmail.mockReturnValue({
            subject:
                'Votre mot de passe a été modifié',
            text:
                'Notification texte',
            html:
                '<p>Notification HTML</p>',
        });

        sendEmail.mockResolvedValue({
            messageId: 'message-id',
        });
        const result =
            await resetUserPassword({
                token: rawResetToken,
                newPassword:
                    'nouveau mot de passe suffisamment long',
            });
        expect(
            buildPasswordChangedEmail,
        ).toHaveBeenCalledTimes(1);

        expect(sendEmail).toHaveBeenCalledWith({
            to: user.email,
            subject:
                'Votre mot de passe a été modifié',
            text:
                'Notification texte',
            html:
                '<p>Notification HTML</p>',
        });

        /*
         * Le token brut n'est jamais recherché en base.
         * Le service utilise uniquement son empreinte SHA-256.
         */
        expect(
            PasswordResetToken.findOne,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                tokenHash:
                    expectedTokenHash,
                usedAt: null,
                revokedAt: null,
            }),
        );

        expect(
            User.findById,
        ).toHaveBeenCalledWith(
            'user-id',
        );

        expect(
            AuthIdentity.findOne,
        ).toHaveBeenCalledWith({
            user: 'user-id',
            provider:
                AUTH_PROVIDER.LOCAL,
        });

        expect(
            verifyPassword,
        ).toHaveBeenCalledWith(
            'nouveau mot de passe suffisamment long',
            'stored-password-hash',
        );

        expect(
            hashPassword,
        ).toHaveBeenCalledWith(
            'nouveau mot de passe suffisamment long',
        );

        /*
         * La seconde opération sur PasswordResetToken
         * constitue la consommation transactionnelle définitive.
         */
        expect(
            PasswordResetToken
                .findOneAndUpdate,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                _id:
                    'password-reset-token-id',
                tokenHash:
                    expectedTokenHash,
                usedAt: null,
                revokedAt: null,
            }),
            {
                $set: {
                    usedAt:
                        expect.any(Date),
                },
            },
            {
                returnDocument: 'after',
                session,
            },
        );

        /*
         * L'ancien hash fait partie du filtre :
         * une modification concurrente ne doit pas être écrasée.
         */
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

        expect(
            User.updateOne,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: 'user-id',
            }),
            {
                $set: {
                    passwordChangedAt:
                        expect.any(Date),
                    updatedBy: null,
                },
            },
            {
                session,
            },
        );

        /*
         * Toutes les anciennes sessions sont révoquées
         * avec la même raison que pour change-password.
         */
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
    it('refuse un token de réinitialisation invalide ou inutilisable', async () => {
        /*
         * Aucun document ne correspond au token hashé avec les conditions :
         *
         * - usedAt: null ;
         * - revokedAt: null ;
         * - expiresAt > maintenant.
         *
         * Ce cas couvre publiquement :
         * token inconnu, expiré, révoqué ou déjà utilisé.
         */
        PasswordResetToken.findOne.mockResolvedValue(
            null,
        );

        await expect(
            resetUserPassword({
                token: 'invalid-reset-token',
                newPassword:
                    'nouveau mot de passe suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message:
                'Lien de réinitialisation invalide ou expiré',
        });

        /*
         * Le workflow doit s'arrêter immédiatement.
         * Aucune donnée liée au compte ne doit être consultée
         * ni modifiée après l'échec de validation du token.
         */
        expect(User.findById).not.toHaveBeenCalled();

        expect(
            AuthIdentity.findOne,
        ).not.toHaveBeenCalled();

        expect(
            hashPassword,
        ).not.toHaveBeenCalled();

        expect(
            PasswordResetToken.findOneAndUpdate,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('refuse la réinitialisation pour un compte clôturé', async () => {
        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        PasswordResetToken.findOne.mockResolvedValue(
            passwordResetToken,
        );

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'closed',
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

        /*
         * CLOSED est un état terminal du compte.
         *
         * Le reset ne doit donc même pas poursuivre jusqu'à
         * l'identité d'authentification.
         */
        expect(
            AuthIdentity.findOne,
        ).not.toHaveBeenCalled();

        expect(
            hashPassword,
        ).not.toHaveBeenCalled();

        expect(
            PasswordResetToken.findOneAndUpdate,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('refuse la réinitialisation si l’identité locale n’existe plus', async () => {
        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        PasswordResetToken.findOne.mockResolvedValue(
            passwordResetToken,
        );

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'active',
        });

        /*
         * findOne() retourne normalement une Query Mongoose
         * sur laquelle le service applique .select('+passwordHash').
         */
        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue(null),
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

        expect(
            AuthIdentity.findOne,
        ).toHaveBeenCalledWith({
            user: 'user-id',
            provider: AUTH_PROVIDER.LOCAL,
        });

        /*
         * reset-password ne doit jamais créer implicitement
         * une identité LOCAL qui n'existe pas.
         */
        expect(
            AuthIdentity.create,
        ).not.toHaveBeenCalled();

        expect(
            hashPassword,
        ).not.toHaveBeenCalled();

        expect(
            PasswordResetToken.findOneAndUpdate,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('refuse de réutiliser le mot de passe actuel', async () => {
        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        PasswordResetToken.findOne.mockResolvedValue(
            passwordResetToken,
        );

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'active',
        });

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            }),
        });

        /*
         * true signifie que le nouveau mot de passe
         * correspond déjà au hash actuellement enregistré.
         */
        verifyPassword.mockResolvedValue(true);

        await expect(
            resetUserPassword({
                token: 'opaque-reset-token',
                newPassword:
                    'mot de passe actuel suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message:
                'Le nouveau mot de passe doit être différent',
        });

        /*
         * Aucun nouveau hash Argon2id ne doit être calculé
         * puisque le mot de passe est déjà connu comme identique.
         */
        expect(
            hashPassword,
        ).not.toHaveBeenCalled();

        expect(
            PasswordResetToken.findOneAndUpdate,
        ).not.toHaveBeenCalled();

        expect(
            AuthIdentity.updateOne,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('refuse le reset si le token devient inutilisable avant sa consommation transactionnelle', async () => {
        const session = {
            id: 'mongo-session',
        };

        PasswordResetToken.findOne.mockResolvedValue({
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        });

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'active',
        });

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(false);

        hashPassword.mockResolvedValue(
            'new-password-hash',
        );

        /*
         * La première lecture avait réussi, mais la consommation
         * transactionnelle ne trouve désormais plus le token.
         *
         * Cela simule notamment une seconde requête ayant gagné
         * la course et consommé le token juste avant celle-ci.
         */
        PasswordResetToken.findOneAndUpdate
            .mockResolvedValue(null);

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

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

        /*
         * Le token constitue le premier verrou de la transaction.
         * Si sa consommation échoue, aucune donnée d'authentification
         * ne doit être modifiée.
         */
        expect(
            AuthIdentity.updateOne,
        ).not.toHaveBeenCalled();

        expect(
            User.updateOne,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('refuse d’écraser un mot de passe modifié simultanément', async () => {
        const session = {
            id: 'mongo-session',
        };

        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        PasswordResetToken.findOne.mockResolvedValue(
            passwordResetToken,
        );

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'active',
        });

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(false);

        hashPassword.mockResolvedValue(
            'new-password-hash',
        );

        PasswordResetToken.findOneAndUpdate
            .mockResolvedValue({
                ...passwordResetToken,
                usedAt: new Date(),
            });

        /*
         * modifiedCount = 0 indique que le document existe,
         * mais que l'ancien passwordHash du filtre ne correspond plus.
         *
         * Un autre workflow a donc changé le credential
         * depuis notre lecture initiale.
         */
        AuthIdentity.updateOne.mockResolvedValue({
            modifiedCount: 0,
        });

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

        await expect(
            resetUserPassword({
                token: 'opaque-reset-token',
                newPassword:
                    'nouveau mot de passe suffisamment long',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Le mot de passe a été modifié simultanément',
        });

        /*
         * Le User et les sessions ne doivent pas être traités
         * après détection du conflit.
         *
         * En base réelle, la transaction rollbackera également
         * la consommation du PasswordResetToken.
         */
        expect(
            User.updateOne,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('refuse le reset si le compte devient indisponible pendant la transaction', async () => {
        const session = {
            id: 'mongo-session',
        };

        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        PasswordResetToken.findOne.mockResolvedValue(
            passwordResetToken,
        );

        /*
         * Au moment de la première lecture, le compte est encore actif.
         */
        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'active',
        });

        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                _id: 'identity-id',
                passwordHash:
                    'stored-password-hash',
            }),
        });

        verifyPassword.mockResolvedValue(false);

        hashPassword.mockResolvedValue(
            'new-password-hash',
        );

        /*
         * Le token est encore consommable lorsque la transaction commence.
         */
        PasswordResetToken.findOneAndUpdate
            .mockResolvedValue({
                ...passwordResetToken,
                usedAt: new Date(),
            });

        AuthIdentity.updateOne.mockResolvedValue({
            modifiedCount: 1,
        });

        /*
         * matchedCount = 0 simule ici un changement d'état concurrent.
         *
         * Par exemple :
         * le compte est passé de ACTIVE à CLOSED entre la lecture
         * préliminaire et l'update transactionnel.
         *
         * Le filtre du service n'accepte alors plus le User.
         */
        User.updateOne.mockResolvedValue({
            matchedCount: 0,
        });

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

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

        /*
         * La révocation des sessions ne doit pas être poursuivie
         * puisque l'état du User ne permet plus le reset.
         *
         * Avec une vraie transaction MongoDB, les écritures précédentes
         * de cette transaction seront également rollbackées.
         */
        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });
    it('considère le reset comme réussi même si la notification email échoue', async () => {
        const session = {
            id: 'mongo-session',
        };

        const rawResetToken =
            'opaque-reset-token';

        const passwordResetToken = {
            _id: 'password-reset-token-id',
            user: 'user-id',
            usedAt: null,
            revokedAt: null,
            expiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
            ),
        };

        const user = {
            _id: 'user-id',
            email: 'greg@example.com',
            status: 'active',
        };

        const authIdentity = {
            _id: 'identity-id',
            passwordHash:
                'stored-password-hash',
        };

        PasswordResetToken.findOne
            .mockResolvedValue(
                passwordResetToken,
            );

        User.findById.mockResolvedValue(user);

        AuthIdentity.findOne.mockReturnValue({
            select: vi
                .fn()
                .mockResolvedValue(
                    authIdentity,
                ),
        });

        verifyPassword.mockResolvedValue(false);

        hashPassword.mockResolvedValue(
            'new-password-hash',
        );

        PasswordResetToken.findOneAndUpdate
            .mockResolvedValue({
                ...passwordResetToken,
                usedAt: new Date(),
            });

        AuthIdentity.updateOne.mockResolvedValue({
            modifiedCount: 1,
        });

        User.updateOne.mockResolvedValue({
            matchedCount: 1,
        });

        revokeAllUserAuthSessions
            .mockResolvedValue({
                modifiedCount: 2,
            });

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

        buildPasswordChangedEmail
            .mockReturnValue({
                subject:
                    'Votre mot de passe a été modifié',
                text:
                    'Notification texte',
                html:
                    '<p>Notification HTML</p>',
            });

        /*
         * La modification du mot de passe a réussi,
         * mais le canal SMTP devient indisponible.
         */
        sendEmail.mockRejectedValue(
            new Error('SMTP unavailable'),
        );

        /*
         * L'échec SMTP est volontairement journalisé côté serveur.
         * On neutralise ici console.error pour ne pas polluer Vitest.
         */
        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        const result =
            await resetUserPassword({
                token: rawResetToken,
                newPassword:
                    'nouveau mot de passe suffisamment long',
            });

        /*
         * L'échec de la notification ne doit jamais annuler
         * un changement de mot de passe déjà validé en base.
         */
        expect(result).toEqual({
            passwordChangedAt:
                expect.any(Date),
        });

        expect(
            buildPasswordChangedEmail,
        ).toHaveBeenCalledTimes(1);

        expect(sendEmail).toHaveBeenCalledWith({
            to: 'greg@example.com',
            subject:
                'Votre mot de passe a été modifié',
            text:
                'Notification texte',
            html:
                '<p>Notification HTML</p>',
        });

        expect(
            consoleErrorSpy,
        ).toHaveBeenCalledWith(
            'Password changed notification email failed',
            {
                userId: 'user-id',
                errorName: 'Error',
            },
        );

        consoleErrorSpy.mockRestore();
    });
});



