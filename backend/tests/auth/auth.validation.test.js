import { describe, expect, it } from 'vitest';

import {
    changePasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
} from '../../modules/auth/auth.validation.js';

describe('auth.validation', () => {
    it('accepte une inscription locale valide avec acceptation contractuelle', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
            legalAccepted: true,
        });

        expect(result.success).toBe(true);
    });

    it('refuse une inscription sans acceptation contractuelle explicite', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
            legalAccepted: false,
        });

        expect(result.success).toBe(false);
    });

    it('refuse les champs internes lors de l’inscription', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'une phrase de passe suffisamment longue',
            legalAccepted: true,
            platformRole: 'super_admin',
        });

        expect(result.success).toBe(false);
    });

    it('refuse un nouveau mot de passe trop court', () => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password: 'trop-court',
            legalAccepted: true,
        });

        expect(result.success).toBe(false);
    });

    it.each([
        'password123456789',
        '123456789012345',
        'aaaaaaaaaaaaaaa',
        'azertyuiopazerty',
    ])('refuse le nouveau mot de passe prévisible %s', (password) => {
        const result = registerSchema.safeParse({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            password,
            legalAccepted: true,
        });

        expect(result.success).toBe(false);
    });

    it('accepte au login un ancien credential court encore valide', () => {
        const result = loginSchema.safeParse({
            email: 'greg@example.com',
            password: 'Ancien!123',
        });

        expect(result.success).toBe(true);
    });

    it('accepte une demande de changement de mot de passe valide', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword: 'Ancien!123',
            newPassword: 'nouvelle phrase de passe suffisamment longue',
        });

        expect(result.success).toBe(true);
    });

    it('refuse un nouveau mot de passe prévisible lors du changement', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword: 'Ancien!123',
            newPassword: 'password123456789',
        });

        expect(result.success).toBe(false);
    });

    it('refuse un changement de mot de passe contenant un champ inconnu', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword: 'Ancien!123',
            newPassword: 'nouvelle phrase de passe suffisamment longue',
            userId: 'user-id-interdit',
        });

        expect(result.success).toBe(false);
    });

    it('accepte une demande de réinitialisation de mot de passe valide', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'token-de-reinitialisation-opaque',
            newPassword: 'nouvelle phrase de passe suffisamment longue',
        });

        expect(result.success).toBe(true);
    });

    it('refuse une demande de réinitialisation sans token', () => {
        const result = resetPasswordSchema.safeParse({
            token: '',
            newPassword: 'nouvelle phrase de passe suffisamment longue',
        });

        expect(result.success).toBe(false);
    });

    it('refuse un mot de passe prévisible lors du reset', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'token-de-reinitialisation-opaque',
            newPassword: '123456789012345',
        });

        expect(result.success).toBe(false);
    });

    it('refuse une demande de réinitialisation contenant un champ inconnu', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'token-de-reinitialisation-opaque',
            newPassword: 'nouvelle phrase de passe suffisamment longue',
            userId: 'user-id-interdit',
        });

        expect(result.success).toBe(false);
    });
});
