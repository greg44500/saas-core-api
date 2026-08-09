import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { env } from '../../config/env.js';
import {
    signAccessToken,
    verifyAccessToken,
} from '../../utils/jwt.js';


describe('JWT access token', () => {
    it('génère un access token vérifiable pour le bon utilisateur', () => {
        const userId = '507f1f77bcf86cd799439011';

        const token = signAccessToken(userId);
        const payload = verifyAccessToken(token);

        expect(payload.sub).toBe(userId);
    });


    it('refuse un token signé avec un autre secret', () => {
        const token = jwt.sign(
            {},
            'another-secret-that-is-long-enough-for-this-test',
            {
                algorithm: 'HS256',
                subject: '507f1f77bcf86cd799439011',
                expiresIn: '15m',
                issuer: env.JWT_ACCESS_ISSUER,
                audience: env.JWT_ACCESS_AUDIENCE,
            },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });


    it('refuse un access token expiré', () => {
        const token = jwt.sign(
            {},
            env.JWT_ACCESS_SECRET,
            {
                algorithm: 'HS256',
                subject: '507f1f77bcf86cd799439011',
                expiresIn: -1,
                issuer: env.JWT_ACCESS_ISSUER,
                audience: env.JWT_ACCESS_AUDIENCE,
            },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });
});