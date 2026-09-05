import express from 'express';
import request from 'supertest';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createPlatformInvitationAcceptRateLimiter,
} from '../../config/platformInvitationRateLimit.config.js';


describe('platformInvitationAcceptRateLimiter', () => {
    it('bloque les tentatives répétées au-delà de la limite configurée', async () => {
        const app = express();

        app.use(
            createPlatformInvitationAcceptRateLimiter({
                windowMs: 60_000,
                limit: 1,
            }),
        );
        app.post('/accept', (req, res) => {
            res.status(204).send();
        });

        const first = await request(app).post('/accept');
        const second = await request(app).post('/accept');

        expect(first.status).toBe(204);
        expect(second.status).toBe(429);
        expect(second.body).toMatchObject({
            status: 'fail',
        });
    });
});
