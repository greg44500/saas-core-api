import { describe, expect, it } from 'vitest';

import { buildPasswordResetUrl } from '../../modules/auth/passwordResetUrl.js';

describe('buildPasswordResetUrl', () => {
    it("construit l'URL de réinitialisation depuis l'origine frontend configurée", () => {
        const result = buildPasswordResetUrl({
            token: 'opaque-reset-token',
        });

        const url = new URL(result);

        // L'origine doit obligatoirement provenir de CLIENT_URL.
        // Le workflow ne doit jamais dépendre du Host d'une requête HTTP.
        expect(url.origin).toBe('http://localhost:5173');
        expect(url.pathname).toBe('/reset-password');

        // Le secret ne doit jamais être transporté dans la query string.
        expect(url.search).toBe('');

        const fragmentParams = new URLSearchParams(url.hash.slice(1));

        expect(fragmentParams.get('token')).toBe('opaque-reset-token');
    });

    it('encode correctement le token dans le fragment', () => {
        const token = 'token+avec/caracteres=sensibles';

        const result = buildPasswordResetUrl({
            token,
        });

        const url = new URL(result);
        const fragmentParams = new URLSearchParams(url.hash.slice(1));

        // Le consommateur doit récupérer exactement le token initial,
        // même lorsque celui-ci nécessite un encodage.
        expect(fragmentParams.get('token')).toBe(token);
    });
});