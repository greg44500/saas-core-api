import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiRateLimiter } from '../../config/rateLimit.config.js';

const createTestApp = () => {
    const app = express();

    const testRateLimiter = createApiRateLimiter({
        windowMs: 60 * 1000,
        limit: 2,
    });

    app.use('/api', testRateLimiter);

    app.get('/api/test', (req, res) => {
        res.status(200).json({
            status: 'success',
        });
    });

    app.get('/public', (req, res) => {
        res.status(200).json({
            status: 'success',
        });
    });

    return app;
};

describe('Rate limiter global', () => {
    it('ajoute les en-têtes modernes de limitation', async () => {
        const app = createTestApp();

        const response = await request(app).get('/api/test');

        expect(response.status).toBe(200);
        expect(response.headers.ratelimit).toBeDefined();
        expect(response.headers['ratelimit-policy']).toBeDefined();

        expect(response.headers['x-ratelimit-limit']).toBeUndefined();
        expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
        expect(response.headers['x-ratelimit-reset']).toBeUndefined();
    });

    it('renvoie une erreur 429 après dépassement du quota', async () => {
        const app = createTestApp();

        await request(app).get('/api/test');
        await request(app).get('/api/test');

        const response = await request(app).get('/api/test');

        expect(response.status).toBe(429);
        expect(response.body).toEqual({
            status: 'fail',
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        });
        expect(response.headers['retry-after']).toBeDefined();
    });

    it('ne limite pas les routes situées hors de /api', async () => {
        const app = createTestApp();

        const response = await request(app).get('/public');

        expect(response.status).toBe(200);
        expect(response.headers.ratelimit).toBeUndefined();
        expect(response.headers['ratelimit-policy']).toBeUndefined();
    });
});