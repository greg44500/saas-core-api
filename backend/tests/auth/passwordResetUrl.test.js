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

        // On vérifie le token via searchParams plutôt qu'en comparant toute
        // l'URL afin de tester le contrat fonctionnel et non son formatage.
        expect(url.searchParams.get('token')).toBe(
            'opaque-reset-token',
        );
    });

    it('encode correctement le token dans la query string', () => {
        const token = 'token+avec/caracteres=sensibles';

        const result = buildPasswordResetUrl({
            token,
        });

        const url = new URL(result);

        // Le consommateur de l'URL doit récupérer exactement le token initial,
        // même lorsque celui-ci contient des caractères nécessitant un encodage.
        expect(url.searchParams.get('token')).toBe(token);
    });
});