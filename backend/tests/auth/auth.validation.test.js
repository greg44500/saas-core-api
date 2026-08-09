import { describe, expect, it } from 'vitest';

import {
    loginSchema,
    registerSchema,
} from '../../modules/auth/auth.validation.js';

describe('auth.validation', () => {
    it('accepte une inscription locale valide', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
        });

        expect(result.success).toBe(true);
    });

    it('refuse les champs internes lors de l’inscription', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
            platformRole: 'super_admin',
        });

        expect(result.success).toBe(false);
    });

    it('refuse un mot de passe trop court', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'trop-court',
        });

        expect(result.success).toBe(false);
    });

    it('accepte des identifiants de connexion valides', () => {
        const result = loginSchema.safeParse({
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
        });

        expect(result.success).toBe(true);
    });
});