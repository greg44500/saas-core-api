import { describe, expect, it } from 'vitest';

import {
    changePasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
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
    it('accepte une demande de changement de mot de passe valide', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword:
                'mot de passe actuel suffisamment long',
            newPassword:
                'nouveau mot de passe suffisamment long',
        });

        expect(result.success).toBe(true);
    });

    it('refuse un changement de mot de passe contenant un champ inconnu', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword:
                'mot de passe actuel suffisamment long',
            newPassword:
                'nouveau mot de passe suffisamment long',
            userId: 'user-id-interdit',
        });

        expect(result.success).toBe(false);
    });
    it('accepte une demande de réinitialisation de mot de passe valide', () => {
    const result = resetPasswordSchema.safeParse({
        token: 'token-de-reinitialisation-opaque',
        newPassword:
            'nouveau mot de passe suffisamment long',
    });

    expect(result.success).toBe(true);
});

it('refuse une demande de réinitialisation sans token', () => {
    const result = resetPasswordSchema.safeParse({
        token: '',
        newPassword:
            'nouveau mot de passe suffisamment long',
    });

    expect(result.success).toBe(false);
});

it('refuse une demande de réinitialisation contenant un champ inconnu', () => {
    const result = resetPasswordSchema.safeParse({
        token: 'token-de-reinitialisation-opaque',
        newPassword:
            'nouveau mot de passe suffisamment long',
        userId: 'user-id-interdit',
    });

    expect(result.success).toBe(false);
});
});