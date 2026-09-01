import { describe, expect, it } from 'vitest';

import { toPublicUser } from '../../modules/auth/publicUser.dto.js';

describe('toPublicUser', () => {
    it('conserve le DTO historique pour un utilisateur standard', () => {
        const user = {
            _id: { toString: () => 'user-id' },
            firstName: 'Jean',
            lastName: 'Martin',
            email: 'jean@example.com',
            emailVerifiedAt: null,
            platformRole: 'user',
        };

        expect(toPublicUser(user)).toEqual({
            id: 'user-id',
            firstName: 'Jean',
            lastName: 'Martin',
            email: 'jean@example.com',
            emailVerifiedAt: null,
        });
    });

    it('expose super_admin lorsqu’il ouvre la console plateforme', () => {
        const user = {
            id: 'admin-id',
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@example.com',
            emailVerifiedAt: null,
            platformRole: 'super_admin',
        };

        expect(toPublicUser(user)).toEqual({
            id: 'admin-id',
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@example.com',
            emailVerifiedAt: null,
            platformRole: 'super_admin',
        });
    });
});
