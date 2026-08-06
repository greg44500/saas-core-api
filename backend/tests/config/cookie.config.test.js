import { describe, expect, it } from 'vitest';

import {
    refreshCookieName,
    refreshCookieOptions,
} from '../../config/cookie.config.js';
import { env } from '../../config/env.js';

describe('Configuration du cookie de refresh token', () => {
    it('exporte le nom attendu pour le cookie', () => {
        expect(refreshCookieName).toBe('refreshToken');
    });

    it('applique les options prévues au cookie', () => {
        expect(refreshCookieOptions).toEqual({
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    });

    it("empêche la modification accidentelle de l'objet d'options", () => {
        expect(Object.isFrozen(refreshCookieOptions)).toBe(true);
    });
});