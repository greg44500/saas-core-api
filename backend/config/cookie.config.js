import { env } from './env.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const refreshCookieName = 'refreshToken';

const refreshCookieOptions = Object.freeze({
    httpOnly: true,

    // Le cookie ne doit être transmis qu'en HTTPS en production.
    secure: env.NODE_ENV === 'production',

    // Adapté à notre architecture web actuelle.
    // À réévaluer si frontend et API sont réellement cross-site.
    sameSite: 'lax',

    // Le cookie doit être accessible à refresh ET logout.
    path: '/api/auth',

    // Même durée que l'AuthSession associée.
    maxAge:
        env.REFRESH_TOKEN_EXPIRES_IN_DAYS *
        MILLISECONDS_PER_DAY,
});

export {
    refreshCookieName,
    refreshCookieOptions,
};