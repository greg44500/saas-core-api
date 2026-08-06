import { rateLimit } from 'express-rate-limit';

const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const API_RATE_LIMIT_MAX_REQUESTS = 300;

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
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        },
    });

const apiRateLimiter = createApiRateLimiter();

export { apiRateLimiter, createApiRateLimiter };