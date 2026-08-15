import { createHash } from 'node:crypto';

import {
    ipKeyGenerator,
    rateLimit,
} from 'express-rate-limit';

import { canonicalizeEmail } from '../utils/canonicalizeEmail.js';


/*
 * Rate limit général de l'API.
 *
 * Il constitue une première protection contre les abus globaux,
 * mais il n'est volontairement pas suffisant pour les endpoints
 * sensibles comme forgot-password.
 */
const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const API_RATE_LIMIT_MAX_REQUESTS = 300;


/*
 * forgot-password est beaucoup plus sensible qu'une route API classique :
 * une requête peut provoquer des accès MongoDB, la création d'un token
 * et l'envoi d'un email.
 *
 * On applique donc des seuils plus restrictifs.
 */
const FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS =
    15 * 60 * 1000;

const FORGOT_PASSWORD_IP_MAX_REQUESTS = 10;

const FORGOT_PASSWORD_EMAIL_MAX_REQUESTS = 3;


const FORGOT_PASSWORD_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.',
};


/**
 * Crée le rate limiter général de l'API.
 *
 * La factory reste exportée afin de pouvoir créer,
 * notamment dans les tests, une instance avec des limites réduites
 * sans modifier la configuration utilisée en production.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @returns {import('express').RequestHandler}
 */
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
 * Crée le rate limiter IP dédié à forgot-password.
 *
 * Cette première barrière limite le nombre total de demandes
 * provenant d'une même origine réseau, indépendamment des emails
 * fournis dans les différentes requêtes.
 *
 * ipKeyGenerator() est utilisé plutôt que req.ip directement
 * afin de conserver la normalisation IPv6 prévue par
 * express-rate-limit.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @returns {import('express').RequestHandler}
 */
const createForgotPasswordIpRateLimiter = ({
    windowMs = FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = FORGOT_PASSWORD_IP_MAX_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator: (req) =>
            ipKeyGenerator(req.ip),

        message:
            FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });


/**
 * Construit une clé non sensible pour limiter les demandes
 * visant une même adresse email.
 *
 * L'email est d'abord canonisé avec la même règle que celle
 * utilisée par Auth, puis transformé en SHA-256.
 *
 * L'adresse email brute n'est ainsi pas utilisée comme clé
 * interne du store du rate limiter.
 *
 * Si aucun email exploitable n'est présent dans le body,
 * on retombe sur une clé basée sur l'IP.
 *
 * La validation Zod reste responsable de décider ensuite
 * si le body représente une requête HTTP valide.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const buildForgotPasswordEmailRateLimitKey = (req) => {
    const email = req.body?.email;

    if (
        typeof email !== 'string'
        || email.trim() === ''
    ) {
        return `ip:${ipKeyGenerator(req.ip)}`;
    }

    const emailCanonical =
        canonicalizeEmail(email);

    const emailHash = createHash('sha256')
        .update(emailCanonical)
        .digest('hex');

    return `email:${emailHash}`;
};


/**
 * Crée le rate limiter dédié à une même adresse email
 * sur le workflow forgot-password.
 *
 * Cette protection est indépendante de l'existence réelle
 * du compte : la clé est calculée uniquement à partir
 * de la donnée reçue dans la requête.
 *
 * Cette propriété est importante afin que le rate limiter
 * ne révèle jamais si une adresse correspond à un User.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @returns {import('express').RequestHandler}
 */
const createForgotPasswordEmailRateLimiter = ({
    windowMs = FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = FORGOT_PASSWORD_EMAIL_MAX_REQUESTS,
} = {}) =>
    rateLimit({
        windowMs,
        limit,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator:
            buildForgotPasswordEmailRateLimitKey,

        message:
            FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });


const apiRateLimiter =
    createApiRateLimiter();

const forgotPasswordIpRateLimiter =
    createForgotPasswordIpRateLimiter();

const forgotPasswordEmailRateLimiter =
    createForgotPasswordEmailRateLimiter();


export {
    apiRateLimiter,

    forgotPasswordEmailRateLimiter,
    forgotPasswordIpRateLimiter,

    createApiRateLimiter,
    createForgotPasswordEmailRateLimiter,
    createForgotPasswordIpRateLimiter,
};