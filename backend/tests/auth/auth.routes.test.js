import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.js';
import {
    authenticate,
} from '../../middlewares/authenticate.js';
import {
    refreshCookieName,
} from '../../config/cookie.config.js';
import {
    changeUserPassword,
    forgotUserPassword,
    loginUser,
    registerUser,
    resetUserPassword,
} from '../../modules/auth/auth.service.js';
import {
    revokeCurrentAuthSession,
    rotateAuthSession,
} from '../../modules/authSessions/authSession.service.js';
import { signAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
    changeUserPassword: vi.fn(),
    forgotUserPassword: vi.fn(),
    loginUser: vi.fn(),
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


describe('GET /api/auth/password-policy', () => {
    it('expose la représentation publique de la politique canonique', async () => {
        const response = await request(app)
            .get('/api/auth/password-policy');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.passwordPolicy).toEqual(
            expect.objectContaining({
                minLength: 15,
                maxLength: 128,
                levels: expect.arrayContaining([
                    expect.objectContaining({ key: 'weak', label: 'Faible' }),
                    expect.objectContaining({ key: 'good', label: 'Correct' }),
                    expect.objectContaining({ key: 'strong', label: 'Robuste' }),
                ]),
            }),
        );
    });
});


describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne 201 pour une inscription valide et transmet le contexte de preuve', async () => {
        registerUser.mockResolvedValue({
            _id: 'user-id',
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailVerifiedAt: null,
        });

        const response = await request(app)
            .post('/api/auth/register')
            .set('User-Agent', 'Vitest Registration Client')
            .send({
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                password: 'une phrase longue et unique pour greg 47!',
                legalAccepted: true,
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
            password: 'une phrase longue et unique pour greg 47!',
            legalAccepted: true,
            ipAddress: expect.any(String),
            userAgent: 'Vitest Registration Client',
        });
    });

    it('retourne 400 si l’acceptation contractuelle manque', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                password: 'une phrase longue et unique pour greg 47!',
            });

        expect(response.status).toBe(400);
        expect(registerUser).not.toHaveBeenCalled();
    });

    it('retourne 400 si le nouveau mot de passe est invalide', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                password: 'trop-court',
                legalAccepted: true,
            });

        expect(response.status).toBe(400);
        expect(registerUser).not.toHaveBeenCalled();
    });
});


describe('POST /api/auth/login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('continue d’accepter un credential existant plus court que la nouvelle politique', async () => {
        loginUser.mockResolvedValue({
            user: {
                _id: 'user-id',
                firstName: 'Greg',
                lastName: 'Ballat',
                email: 'greg@example.com',
                emailVerifiedAt: null,
                passwordChangedAt: null,
            },
            refreshToken: 'refresh-token-test',
        });
        signAccessToken.mockReturnValue('access-token-test');

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'legacy-login@example.com',
                password: 'Old!123',
            });

        expect(response.status).toBe(200);
        expect(loginUser).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'legacy-login@example.com',
                password: 'Old!123',
            }),
        );
    });
});


describe('POST /api/auth/forgot-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne une réponse générique pour une demande valide', async () => {
        const genericMessage =
            'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.';

        forgotUserPassword.mockResolvedValue(
            { message: genericMessage, },
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
            .set(
                'User-Agent',
                'Mozilla/5.0 Test Browser',
            )
            .send({
                currentPassword:
                    'credential-actuel-valide',
                newPassword:
                    'Phrase nouvelle, longue et unique 47!',
            });

        expect(response.status).toBe(204);

        expect(authenticate).toHaveBeenCalledOnce();

        expect(
            changeUserPassword,
        ).toHaveBeenCalledWith({
            userId: 'user-id',
            currentPassword:
                'credential-actuel-valide',
            newPassword:
                'Phrase nouvelle, longue et unique 47!',
            ipAddress: expect.any(String),
            userAgent: 'Mozilla/5.0 Test Browser',
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
            .set(
                'User-Agent',
                'Vitest Test Client',
            )
            .send({
                token: 'opaque-reset-token',
                newPassword:
                    'Phrase réinitialisée, longue et unique 83!',
            });

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            status: 'success',
            message:
                'Mot de passe réinitialisé avec succès.',
        });

        expect(
            resetUserPassword,
        ).toHaveBeenCalledWith({
            token: 'opaque-reset-token',
            newPassword:
                'Phrase réinitialisée, longue et unique 83!',
            ipAddress: expect.any(String),
            userAgent: 'Vitest Test Client',
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
        expect(resetUserPassword).not.toHaveBeenCalled();
    });
});
