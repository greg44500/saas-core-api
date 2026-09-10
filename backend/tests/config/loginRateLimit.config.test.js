import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
    createLoginEmailRateLimiter,
    createLoginIpRateLimiter,
} from '../../config/rateLimit.config.js';

const createLoginTestApp = (limiter) => {
    const app = express();
    app.use(express.json());
    app.post('/login', limiter, (req, res) => {
        if (req.body.password === 'valid') {
            return res.status(200).json({ status: 'success' });
        }

        return res.status(401).json({
            status: 'fail',
            message: 'Identifiants invalides',
        });
    });

    return app;
};

describe('login rate limit', () => {
    it('limite les échecs visant une même identité sans exposer l’email dans la clé', async () => {
        const app = createLoginTestApp(
            createLoginEmailRateLimiter({
                windowMs: 60_000,
                limit: 2,
            }),
        );

        const payload = {
            email: 'User@Example.com',
            password: 'invalid',
        };

        expect((await request(app).post('/login').send(payload)).status).toBe(401);
        expect((await request(app).post('/login').send({
            ...payload,
            email: ' user@example.com ',
        })).status).toBe(401);

        const blocked = await request(app)
            .post('/login')
            .send(payload);

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({
            status: 'fail',
            message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
        });
    });

    it('ne conserve pas une authentification réussie dans le compteur d’échecs', async () => {
        const app = createLoginTestApp(
            createLoginEmailRateLimiter({
                windowMs: 60_000,
                limit: 2,
            }),
        );

        const email = 'success-counter@example.com';

        expect((await request(app).post('/login').send({
            email,
            password: 'invalid',
        })).status).toBe(401);

        expect((await request(app).post('/login').send({
            email,
            password: 'valid',
        })).status).toBe(200);

        expect((await request(app).post('/login').send({
            email,
            password: 'invalid',
        })).status).toBe(401);

        expect((await request(app).post('/login').send({
            email,
            password: 'invalid',
        })).status).toBe(429);
    });

    it('limite aussi une origine réseau qui distribue ses échecs sur plusieurs identités', async () => {
        const app = createLoginTestApp(
            createLoginIpRateLimiter({
                windowMs: 60_000,
                limit: 2,
            }),
        );

        expect((await request(app).post('/login').send({
            email: 'one@example.com',
            password: 'invalid',
        })).status).toBe(401);

        expect((await request(app).post('/login').send({
            email: 'two@example.com',
            password: 'invalid',
        })).status).toBe(401);

        expect((await request(app).post('/login').send({
            email: 'three@example.com',
            password: 'invalid',
        })).status).toBe(429);
    });
});
