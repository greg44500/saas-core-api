import { describe, expect, it } from 'vitest';

import {
    generateRefreshToken,
    hashToken,
} from '../../utils/token.js';

describe('token utils', () => {
    it('génère des refresh tokens opaques différents', () => {
        const firstToken = generateRefreshToken();
        const secondToken = generateRefreshToken();

        expect(firstToken).toBeTruthy();
        expect(secondToken).toBeTruthy();

        expect(firstToken).not.toBe(secondToken);
    });

    it('génère un hash déterministe différent selon le token', () => {
        const token = generateRefreshToken();
        const otherToken = generateRefreshToken();

        const firstHash = hashToken(token);
        const secondHash = hashToken(token);
        const otherHash = hashToken(otherToken);

        expect(firstHash).toBe(secondHash);
        expect(firstHash).not.toBe(otherHash);

        expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    });
});