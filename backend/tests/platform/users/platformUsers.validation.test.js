import { describe, expect, it } from 'vitest';

import {
    closePlatformUserBodySchema,
} from '../../../modules/platform/users/platformUsers.validation.js';

describe('closePlatformUserBodySchema', () => {
    it('accepte une raison explicite de clôture', () => {
        expect(closePlatformUserBodySchema.parse({
            reason: '  Retention policy completed  ',
        })).toEqual({
            reason: 'Retention policy completed',
        });
    });

    it('refuse une raison trop courte ou un champ supplémentaire', () => {
        expect(() => closePlatformUserBodySchema.parse({
            reason: 'x',
        })).toThrow();

        expect(() => closePlatformUserBodySchema.parse({
            reason: 'Retention policy completed',
            force: true,
        })).toThrow();
    });
});
