import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUTH_PROVIDER,
} from '../../constants/authProvider.constants.js';
import {
    confirmCurrentUserPassword,
} from '../../modules/auth/services/confirmCurrentUserPassword.service.js';
import {
    AuthIdentity,
} from '../../modules/authIdentities/authIdentity.model.js';
import {
    verifyPassword,
} from '../../utils/password.js';


vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../utils/password.js', () => ({
    verifyPassword: vi.fn(),
}));


const queryResolving = (value) => ({
    select: vi.fn().mockResolvedValue(value),
});


describe('confirmCurrentUserPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('confirme le mot de passe courant d’une identité locale', async () => {
        AuthIdentity.findOne.mockReturnValue(
            queryResolving({
                passwordHash: 'stored-password-hash',
            }),
        );
        verifyPassword.mockResolvedValue(true);

        await expect(
            confirmCurrentUserPassword({
                userId: 'user-id',
                password: 'current-password-value',
            }),
        ).resolves.toBeUndefined();

        expect(AuthIdentity.findOne).toHaveBeenCalledWith({
            user: 'user-id',
            provider: AUTH_PROVIDER.LOCAL,
        });
        expect(verifyPassword).toHaveBeenCalledWith(
            'current-password-value',
            'stored-password-hash',
        );
    });

    it('refuse un mot de passe incorrect avec un message générique', async () => {
        AuthIdentity.findOne.mockReturnValue(
            queryResolving({
                passwordHash: 'stored-password-hash',
            }),
        );
        verifyPassword.mockResolvedValue(false);

        await expect(
            confirmCurrentUserPassword({
                userId: 'user-id',
                password: 'invalid-password-value',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Confirmation d’identité invalide',
        });
    });

    it('refuse aussi l’absence d’identité locale sans révéler sa cause', async () => {
        AuthIdentity.findOne.mockReturnValue(
            queryResolving(null),
        );

        await expect(
            confirmCurrentUserPassword({
                userId: 'user-id',
                password: 'current-password-value',
            }),
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Confirmation d’identité invalide',
        });

        expect(verifyPassword).not.toHaveBeenCalled();
    });
});
