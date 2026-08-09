import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.js';
import { registerUser } from '../../modules/auth/auth.service.js';

vi.mock('../../modules/auth/auth.service.js', () => ({
    registerUser: vi.fn(),
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