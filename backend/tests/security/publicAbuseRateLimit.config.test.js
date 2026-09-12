import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
    createRegisterIpRateLimiter,
    createResetPasswordIpRateLimiter,
} from '../../config/rateLimit.config.js';
import {
    createWorkspaceInvitationAcceptRateLimiter,
} from '../../config/workspaceInvitationRateLimit.config.js';


const createLimitedApp = (limiter) => {
    const app = express();
    app.use(limiter);
    app.post('/', (_req, res) => {
        res.status(204).send();
    });
    return app;
};


const expectThirdRequestBlocked = async ({
    limiter,
    message,
}) => {
    const app = createLimitedApp(limiter);

    const first = await request(app).post('/');
    const second = await request(app).post('/');
    const third = await request(app).post('/');

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({
        status: 'fail',
        message,
    });
};


describe('public abuse rate limiters', () => {
    it('limite la création massive de comptes par IP', async () => {
        await expectThirdRequestBlocked({
            limiter: createRegisterIpRateLimiter({
                windowMs: 60_000,
                limit: 2,
            }),
            message:
                'Trop de tentatives d’inscription. Veuillez réessayer plus tard.',
        });
    });

    it('limite les tentatives volumétriques de reset-password par IP', async () => {
        await expectThirdRequestBlocked({
            limiter: createResetPasswordIpRateLimiter({
                windowMs: 60_000,
                limit: 2,
            }),
            message:
                'Trop de tentatives de réinitialisation. Veuillez réessayer plus tard.',
        });
    });

    it('limite les acceptations WorkspaceInvitation par IP', async () => {
        await expectThirdRequestBlocked({
            limiter: createWorkspaceInvitationAcceptRateLimiter({
                windowMs: 60_000,
                limit: 2,
            }),
            message:
                'Trop de tentatives d’acceptation. Veuillez réessayer plus tard.',
        });
    });
});
