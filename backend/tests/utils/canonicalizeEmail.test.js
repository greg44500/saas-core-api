import { describe, expect, it } from 'vitest';

import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';

describe('canonicalizeEmail', () => {
    it('normalise un email avec espaces et majuscules', () => {
        expect(canonicalizeEmail('  Greg@Example.com  ')).toBe(
            'greg@example.com',
        );
    });
});