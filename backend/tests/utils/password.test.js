import { describe, expect, it } from 'vitest';

import {
    hashPassword,
    verifyPassword,
} from '../../utils/password.js';

describe('password utils', () => {
    it('hashPassword produit un format Argon2id exploitable', async () => {
        const password = 'une phrase de passe suffisamment longue';

        const passwordHash = await hashPassword(password);

        /*
         * On vérifie uniquement notre contrat de stockage :
         * version + algorithme + paramètres + salt + hash.
         *
         * Le but n'est pas de retester le fonctionnement interne d'Argon2id.
         */
        expect(passwordHash).toMatch(
            /^v1\$argon2id\$m=19456,t=2,p=1,l=32\$[^$]+\$[^$]+$/,
        );

        /*
         * Le mot de passe brut ne doit jamais apparaître
         * dans la valeur destinée à être persistée.
         */
        expect(passwordHash).not.toContain(password);
    });

    it('verifyPassword retourne true avec le bon mot de passe', async () => {
        const password = 'une phrase de passe suffisamment longue';

        const passwordHash = await hashPassword(password);

        const isValid = await verifyPassword(
            password,
            passwordHash,
        );

        expect(isValid).toBe(true);
    });

    it('verifyPassword retourne false avec un mauvais mot de passe', async () => {
        const password = 'une phrase de passe suffisamment longue';

        const passwordHash = await hashPassword(password);

        const isValid = await verifyPassword(
            'une autre phrase de passe incorrecte',
            passwordHash,
        );

        expect(isValid).toBe(false);
    });
});