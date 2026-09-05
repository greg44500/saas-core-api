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

describe('authenticate — fermeture de compte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        verifyAccessToken.mockReturnValue({
            sub: 'user-id',
        });
    });

    it.each([
        ['deletion_requested', 'Fermeture du compte en cours'],
        ['closed', 'Compte clôturé'],
    ])(
        'refuse un ancien access token lorsque le User est %s',
        async (status, message) => {
            const req = {
                get: vi.fn(() => 'Bearer existing-access-token'),
            };
            const res = {};
            const next = vi.fn();

            User.findById.mockResolvedValue({
                _id: 'user-id',
                status,
            });

            await authenticate(req, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 403,
                    message,
                }),
            );
            expect(req.user).toBeUndefined();
        },
    );
});
