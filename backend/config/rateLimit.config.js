import { createHash } from 'node:crypto';

import {
    ipKeyGenerator,
    rateLimit,
} from 'express-rate-limit';

import { canonicalizeEmail } from '../utils/canonicalizeEmail.js';

const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const API_RATE_LIMIT_MAX_REQUESTS = 300;

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_MAX_FAILED_REQUESTS = 50;
const LOGIN_EMAIL_MAX_FAILED_REQUESTS = 10;

const FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_IP_MAX_REQUESTS = 10;
const FORGOT_PASSWORD_EMAIL_MAX_REQUESTS = 3;

const LOGIN_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
};

const FORGOT_PASSWORD_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.',
};

const createApiRateLimiter = ({
    windowMs = API_RATE_LIMIT_WINDOW_MS,
    limit = API_RATE_LIMIT_MAX_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
            status: 'fail',
            message:
                'Trop de requêtes. Veuillez réessayer plus tard.',
        },
    });

/**
 * Construit une clé d'identité pseudonymisée sans consulter la base.
 * Le même calcul est appliqué que le compte existe ou non afin de ne rien
 * révéler sur les utilisateurs enregistrés.
 */
const buildEmailRateLimitKey = (req) => {
    const email = req.body?.email;

    if (typeof email !== 'string' || email.trim() === '') {
        return `ip:${ipKeyGenerator(req.ip)}`;
    }

    const emailCanonical = canonicalizeEmail(email);
    const emailHash = createHash('sha256')
        .update(emailCanonical)
        .digest('hex');

    return `email:${emailHash}`;
};

const createLoginIpRateLimiter = ({
    windowMs = LOGIN_RATE_LIMIT_WINDOW_MS,
    limit = LOGIN_IP_MAX_FAILED_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req) => ipKeyGenerator(req.ip),
        skipSuccessfulRequests: true,
        message: LOGIN_RATE_LIMIT_MESSAGE,
    });

const createLoginEmailRateLimiter = ({
    windowMs = LOGIN_RATE_LIMIT_WINDOW_MS,
    limit = LOGIN_EMAIL_MAX_FAILED_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: buildEmailRateLimitKey,
        skipSuccessfulRequests: true,
        message: LOGIN_RATE_LIMIT_MESSAGE,
    });

const createForgotPasswordIpRateLimiter = ({
    windowMs = FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = FORGOT_PASSWORD_IP_MAX_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req) => ipKeyGenerator(req.ip),
        message: FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });

const createForgotPasswordEmailRateLimiter = ({
    windowMs = FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = FORGOT_PASSWORD_EMAIL_MAX_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: buildEmailRateLimitKey,
        message: FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });

const apiRateLimiter = createApiRateLimiter();
const loginIpRateLimiter = createLoginIpRateLimiter();
const loginEmailRateLimiter = createLoginEmailRateLimiter();
const forgotPasswordIpRateLimiter = createForgotPasswordIpRateLimiter();
const forgotPasswordEmailRateLimiter = createForgotPasswordEmailRateLimiter();

export {
    apiRateLimiter,
    forgotPasswordEmailRateLimiter,
    forgotPasswordIpRateLimiter,
    loginEmailRateLimiter,
    loginIpRateLimiter,
    buildEmailRateLimitKey,
    createApiRateLimiter,
    createForgotPasswordEmailRateLimiter,
    createForgotPasswordIpRateLimiter,
    createLoginEmailRateLimiter,
    createLoginIpRateLimiter,
};
