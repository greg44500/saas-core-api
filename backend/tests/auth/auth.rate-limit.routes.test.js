import express from 'express';
import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    authMiddleware,
    validationMiddleware,
    registerLimiterMiddleware,
    resetLimiterMiddleware,
    otherLimiterMiddleware,
    handlers,
} = vi.hoisted(() => ({
    authMiddleware: vi.fn((_req, _res, next) => next()),
    validationMiddleware: vi.fn((_req, _res, next) => next()),
    registerLimiterMiddleware: vi.fn((_req, _res, next) => next()),
    resetLimiterMiddleware: vi.fn((_req, _res, next) => next()),
    otherLimiterMiddleware: vi.fn((_req, _res, next) => next()),
    handlers: {
        changePassword: vi.fn((_req, res) => res.status(204).send()),
        forgotPassword: vi.fn((_req, res) => res.status(200).json({ status: 'success' })),
        login: vi.fn((_req, res) => res.status(200).json({ status: 'success' })),
        logout: vi.fn((_req, res) => res.status(204).send()),
        logoutAll: vi.fn((_req, res) => res.status(204).send()),
        me: vi.fn((_req, res) => res.status(200).json({ status: 'success' })),
        passwordPolicy: vi.fn((_req, res) => res.status(200).json({ status: 'success' })),
        refresh: vi.fn((_req, res) => res.status(200).json({ status: 'success' })),
        register: vi.fn((_req, res) => res.status(201).json({ status: 'success' })),
        resetPassword: vi.fn((_req, res) => res.status(200).json({ status: 'success' })),
    },
}));

vi.mock('../../config/rateLimit.config.js', () => ({
    forgotPasswordEmailRateLimiter: otherLimiterMiddleware,
    forgotPasswordIpRateLimiter: otherLimiterMiddleware,
    loginEmailRateLimiter: otherLimiterMiddleware,
    loginIpRateLimiter: otherLimiterMiddleware,
    registerIpRateLimiter: registerLimiterMiddleware,
    resetPasswordIpRateLimiter: resetLimiterMiddleware,
}));

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: authMiddleware,
}));

vi.mock('../../middlewares/validateRequest.js', () => ({
    validateRequest: vi.fn(() => validationMiddleware),
}));

vi.mock('../../modules/auth/auth.controller.js', () => handlers);

import { authRouter } from '../../modules/auth/auth.routes.js';


const app = express();
app.use(express.json());
app.use('/auth', authRouter);


beforeEach(() => {
    authMiddleware.mockClear();
    validationMiddleware.mockClear();
    registerLimiterMiddleware.mockClear();
    resetLimiterMiddleware.mockClear();
    otherLimiterMiddleware.mockClear();
    Object.values(handlers).forEach((handler) => handler.mockClear());
});


describe('auth public abuse controls wiring', () => {
    it('rate-limit register avant la validation du body', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({ invalid: true });

        expect(response.status).toBe(201);
        expect(registerLimiterMiddleware).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(handlers.register).toHaveBeenCalledOnce();
        expect(
            registerLimiterMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware.mock.invocationCallOrder[0],
        );
    });

    it('rate-limit reset-password avant la validation du body', async () => {
        const response = await request(app)
            .post('/auth/reset-password')
            .send({ invalid: true });

        expect(response.status).toBe(200);
        expect(resetLimiterMiddleware).toHaveBeenCalledOnce();
        expect(validationMiddleware).toHaveBeenCalledOnce();
        expect(handlers.resetPassword).toHaveBeenCalledOnce();
        expect(
            resetLimiterMiddleware.mock.invocationCallOrder[0],
        ).toBeLessThan(
            validationMiddleware.mock.invocationCallOrder[0],
        );
    });
});
