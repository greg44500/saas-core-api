import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.js';
import {
    authenticate,
} from '../../middlewares/authenticate.js';
import {
    refreshCookieName,
} from '../../config/cookie.config.js';
import { registerUser, changeUserPassword, forgotUserPassword, resetUserPassword } from '../../modules/auth/auth.service.js';
import {
    revokeCurrentAuthSession,
    rotateAuthSession,
} from '../../modules/authSessions/authSession.service.js';
import { signAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
    changeUserPassword: vi.fn(),
    forgotUserPassword: vi.fn(),
    registerUser: vi.fn(),
    resetUserPassword: vi.fn(),
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = {
            id: 'user-id',
        };

        next();
    }),
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
    revokeCurrentAuthSession: vi.fn(),
    rotateAuthSession: vi.fn(),
}));

vi.mock('../../utils/jwt.js', () => ({
    signAccessToken: vi.fn(),
}));


describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne 201 pour une inscription valide', async () => {
        registerUser.mockResolvedValue({
            _id: 'user-id',
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailVerifiedAt: null,
        });

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                password: 'une phrase de passe suffisamment longue',
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual({
            status: 'success',
            data: {
                user: {
                    id: 'user-id',
                    firstName: 'Greg',
                    lastName: 'Ballat',
                    email: 'greg@example.com',
                    emailVerifiedAt: null,
                },
            },
        });

        expect(registerUser).toHaveBeenCalledWith({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
        });
    });

    it('retourne 400 si le body est invalide', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                password: 'trop-court',
            });

        expect(response.status).toBe(400);

        expect(registerUser).not.toHaveBeenCalled();
    });
});
describe('POST /api/auth/forgot-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne une réponse générique pour une demande valide', async () => {
        const genericMessage =
            'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

        /*
         * Le service est mocké ici car ce test vérifie uniquement
         * le contrat HTTP de la route.
         *
         * La recherche du User, la création du token et l'envoi
         * de l'email sont couverts par les tests du service.
         */
        forgotUserPassword.mockResolvedValue(
            { message: genericMessage, }
        );

        const response = await request(app)
            .post('/api/auth/forgot-password')
            .set(
                'User-Agent',
                'Mozilla/5.0 Test Browser',
            )
            .send({
                email: 'greg@example.com',
            });

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            status: 'success',
            message: genericMessage,
        });

        /*
         * Le controller reçoit l'email validé ainsi que le contexte
         * technique préparé par requestContext.
         *
         * L'adresse IP dépend de l'environnement Supertest :
         * on vérifie donc sa présence sans figer ici une valeur
         * qui pourrait rendre le test inutilement fragile.
         */
        expect(
            forgotUserPassword,
        ).toHaveBeenCalledWith({
            email: 'greg@example.com',
            ipAddress: expect.any(String),
            userAgent: 'Mozilla/5.0 Test Browser',
        });
    });

    it('retourne 400 si l’adresse email est invalide', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({
                email: 'adresse-invalide',
            });

        expect(response.status).toBe(400);

        /*
         * Une entrée invalide doit être arrêtée par validateRequest
         * avant d'atteindre le controller puis le service.
         */
        expect(
            forgotUserPassword,
        ).not.toHaveBeenCalled();
    });

    it('retourne 400 si le body contient un champ non autorisé', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({
                email: 'greg@example.com',
                role: 'admin',
            });

        expect(response.status).toBe(400);

        /*
         * forgotPasswordSchema utilise strictObject().
         * Les champs inconnus font donc partie du contrat de sécurité
         * testé au niveau HTTP.
         */
        expect(
            forgotUserPassword,
        ).not.toHaveBeenCalled();
    });
    it('retourne 429 après trop de demandes visant la même adresse email', async () => {
        const genericMessage =
            'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

        forgotUserPassword.mockResolvedValue({
            message: genericMessage,
        });

        /*
         * Cette adresse est volontairement différente de celles utilisées
         * par les autres tests du fichier.
         *
         * Le MemoryStore de express-rate-limit appartient à l'instance
         * du middleware et conserve ses compteurs pendant la suite de tests.
         * Utiliser une clé dédiée rend donc ce test indépendant des requêtes
         * forgot-password exécutées précédemment.
         */
        const email =
            'rate-limit-test@example.com';

        const firstResponse = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });

        const secondResponse = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });

        const thirdResponse = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });

        const fourthResponse = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(thirdResponse.status).toBe(200);

        /*
         * Le quatrième appel dépasse la limite email de
         * trois demandes sur la fenêtre configurée.
         */
        expect(fourthResponse.status).toBe(429);

        expect(fourthResponse.body).toEqual({
            status: 'fail',
            message:
                'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.',
        });

        /*
         * Le quatrième appel doit être arrêté par le middleware.
         *
         * Le controller et donc forgotUserPassword()
         * ne doivent jamais être exécutés pour cette requête.
         */
        expect(
            forgotUserPassword,
        ).toHaveBeenCalledTimes(3);
    });
});

describe('POST /api/auth/refresh', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renouvelle les tokens à partir du refresh token en cookie', async () => {
        rotateAuthSession.mockResolvedValue({
            user: {
                _id: 'user-id',
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                emailVerifiedAt: null,
            },
            refreshToken: 'next-refresh-token',
        });

        signAccessToken.mockReturnValue('new-access-token');

        const response = await request(app)
            .post('/api/auth/refresh')
            .set(
                'Cookie',
                `${refreshCookieName}=current-refresh-token`,
            );

        expect(response.status).toBe(200);

        expect(rotateAuthSession).toHaveBeenCalledWith(
            expect.objectContaining({
                refreshToken: 'current-refresh-token',
            }),
        );
    });
});


describe('POST /api/auth/logout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('révoque la session courante à partir du refresh token en cookie', async () => {
        revokeCurrentAuthSession.mockResolvedValue({
            _id: 'session-id',
            revokedReason: 'logout',
        });

        const response = await request(app)
            .post('/api/auth/logout')
            .set(
                'Cookie',
                `${refreshCookieName}=current-refresh-token`,
            );

        expect(response.status).toBe(204);

        expect(
            revokeCurrentAuthSession,
        ).toHaveBeenCalledWith({
            refreshToken: 'current-refresh-token',
        });
    });
});
describe('POST /api/auth/change-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('protège et exécute le changement de mot de passe', async () => {
        changeUserPassword.mockResolvedValue({
            passwordChangedAt:
                new Date('2026-08-13T12:00:00.000Z'),
        });

        const response = await request(app)
            .post('/api/auth/change-password')
            .send({
                currentPassword:
                    'mot de passe actuel suffisamment long',
                newPassword:
                    'nouveau mot de passe suffisamment long',
            });

        expect(response.status).toBe(204);

        expect(authenticate).toHaveBeenCalledOnce();

        expect(
            changeUserPassword,
        ).toHaveBeenCalledWith({
            userId: 'user-id',
            currentPassword:
                'mot de passe actuel suffisamment long',
            newPassword:
                'nouveau mot de passe suffisamment long',
        });
    });
});

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('réinitialise le mot de passe pour une requête valide', async () => {
        resetUserPassword.mockResolvedValue({
            passwordChangedAt:
                new Date('2026-08-15T09:00:00.000Z'),
        });

        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: 'opaque-reset-token',
                newPassword:
                    'nouveau mot de passe suffisamment long',
            });

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            status: 'success',
            message:
                'Mot de passe réinitialisé avec succès.',
        });

        /*
         * La route doit transmettre au service uniquement
         * les données validées du workflow reset-password.
         */
        expect(
            resetUserPassword,
        ).toHaveBeenCalledWith({
            token: 'opaque-reset-token',
            newPassword:
                'nouveau mot de passe suffisamment long',
        });
    });

    it('retourne 400 si le nouveau mot de passe est invalide', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: 'opaque-reset-token',
                newPassword: 'trop-court',
            });

        expect(response.status).toBe(400);

        /*
         * validateRequest doit bloquer la requête
         * avant l'appel du controller puis du service.
         */
        expect(
            resetUserPassword,
        ).not.toHaveBeenCalled();
    });

    it('retourne 400 si le body contient un champ non autorisé', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
                token: 'opaque-reset-token',
                newPassword:
                    'nouveau mot de passe suffisamment long',
                userId: 'user-id-interdit',
            });

        expect(response.status).toBe(400);

        /*
         * resetPasswordSchema utilise strictObject().
         * Un champ supplémentaire ne doit donc jamais
         * atteindre la couche métier.
         */
        expect(
            resetUserPassword,
        ).not.toHaveBeenCalled();
    });
});