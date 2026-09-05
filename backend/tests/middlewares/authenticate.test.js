import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticate } from '../../middlewares/authenticate.js';
import { User } from '../../modules/users/user.model.js';
import { verifyAccessToken } from '../../utils/jwt.js';


vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
    },
}));


vi.mock('../../utils/jwt.js', () => ({
    verifyAccessToken: vi.fn(),
}));


describe('authenticate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('authentifie un User actif avec un access token valide', async () => {
        const passwordChangedAt =
            new Date('2026-08-13T12:00:00.123Z');

        const user = {
            _id: 'user-id',
            status: 'active',
            passwordChangedAt,
        };

        const req = {
            get: vi.fn(
                () => 'Bearer valid-access-token',
            ),
        };

        const res = {};
        const next = vi.fn();

        verifyAccessToken.mockReturnValue({
            sub: 'user-id',
            passwordChangedAt:
                passwordChangedAt.getTime(),
        });

        User.findById.mockResolvedValue(user);

        await authenticate(req, res, next);

        expect(verifyAccessToken).toHaveBeenCalledWith(
            'valid-access-token',
        );

        expect(User.findById).toHaveBeenCalledWith(
            'user-id',
        );

        expect(req.user).toBe(user);
        expect(next).toHaveBeenCalledWith();
    });

    it('refuse un access token antérieur au changement de mot de passe', async () => {
        const req = {
            get: vi.fn(
                () => 'Bearer previous-access-token',
            ),
        };

        const res = {};
        const next = vi.fn();

        verifyAccessToken.mockReturnValue({
            sub: 'user-id',
        });

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'active',
            passwordChangedAt:
                new Date(
                    '2026-08-13T12:00:00.123Z',
                ),
        });

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 401,
                message:
                    'Access token invalide ou expiré',
            }),
        );

        expect(req.user).toBeUndefined();
    });

    it('refuse une requête sans access token Bearer', async () => {
        const req = {
            get: vi.fn(() => undefined),
        };

        const res = {};

        const next = vi.fn();

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 401,
            }),
        );

        expect(verifyAccessToken).not.toHaveBeenCalled();
        expect(User.findById).not.toHaveBeenCalled();
    });


    it('refuse un access token invalide', async () => {
        const req = {
            get: vi.fn(() => 'Bearer invalid-access-token'),
        };

        const res = {};

        const next = vi.fn();

        verifyAccessToken.mockImplementation(() => {
            throw new Error('invalid token');
        });

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 401,
            }),
        );

        expect(User.findById).not.toHaveBeenCalled();
    });


    it('refuse un User désactivé', async () => {
        const req = {
            get: vi.fn(() => 'Bearer valid-access-token'),
        };

        const res = {};

        const next = vi.fn();

        verifyAccessToken.mockReturnValue({
            sub: 'user-id',
        });

        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'disabled',
        });

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 403,
            }),
        );

        expect(req.user).toBeUndefined();
    });

    it('refuse un User dont la fermeture est en cours', async () => {
        const req = {
            get: vi.fn(() => 'Bearer valid-access-token'),
        };
        const res = {};
        const next = vi.fn();

        verifyAccessToken.mockReturnValue({
            sub: 'user-id',
        });
        User.findById.mockResolvedValue({
            _id: 'user-id',
            status: 'deletion_requested',
        });

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 403,
                message: 'Fermeture du compte en cours',
            }),
        );
        expect(req.user).toBeUndefined();
    });
});