import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.js';
import {
    refreshCookieName,
} from '../../config/cookie.config.js';
import { registerUser } from '../../modules/auth/auth.service.js';
import {
    revokeCurrentAuthSession,
    rotateAuthSession,
} from '../../modules/authSessions/authSession.service.js';
import { signAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/auth/auth.service.js', () => ({
    registerUser: vi.fn(),
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