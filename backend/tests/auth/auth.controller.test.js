import { describe, expect, it, vi } from 'vitest';

import { register } from '../../modules/auth/auth.controller.js';
import { registerUser } from '../../modules/auth/auth.service.js';

vi.mock('../../modules/auth/auth.service.js', () => ({
    registerUser: vi.fn(),
}));

describe('auth.controller', () => {
    it('renvoie le User créé sans exposer ses champs internes', async () => {
        registerUser.mockResolvedValue({
            _id: {
                toString: () => 'user-id',
            },
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            platformRole: 'user',
            emailVerifiedAt: null,
        });

        const req = {
            validated: {
                body: {
                    firstName: 'Greg',
                    lastName: 'Ballat',
                    email: 'greg@example.com',
                    password: 'une phrase de passe suffisamment longue',
                },
            },
        };

        const json = vi.fn();

        const res = {
            status: vi.fn(() => ({
                json,
            })),
        };

        await register(req, res);

        expect(registerUser).toHaveBeenCalledWith(
            req.validated.body,
        );

        expect(res.status).toHaveBeenCalledWith(201);

        expect(json).toHaveBeenCalledWith({
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
    });
});