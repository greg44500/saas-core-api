import { describe, expect, it, vi } from 'vitest';

import { updateMe } from '../../modules/users/user.controller.js';
import { updateCurrentUserProfile } from '../../modules/users/user.service.js';

vi.mock('../../modules/users/user.service.js', () => ({
    updateCurrentUserProfile: vi.fn(),
}));

describe('user.controller updateMe', () => {
    it('retourne le DTO public du profil mis à jour', async () => {
        updateCurrentUserProfile.mockResolvedValue({
            _id: { toString: () => 'user-id' },
            firstName: 'Gregory',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailVerifiedAt: null,
            platformRole: 'user',
        });

        const req = {
            user: { id: 'user-id' },
            validated: {
                body: {
                    firstName: 'Gregory',
                },
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'Test Browser',
            },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await updateMe(req, res);

        expect(updateCurrentUserProfile).toHaveBeenCalledWith({
            userId: 'user-id',
            firstName: 'Gregory',
            lastName: undefined,
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: {
                user: {
                    id: 'user-id',
                    firstName: 'Gregory',
                    lastName: 'Ballat',
                    email: 'greg@example.com',
                    emailVerifiedAt: null,
                },
            },
        });
    });
});
