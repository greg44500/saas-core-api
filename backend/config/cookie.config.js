import { env } from "./env.js";

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const refreshCookieName = 'refreshToken';
const refreshCookieOptions = Object.freeze({
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: SEVEN_DAYS_IN_MS,
})

export { refreshCookieName, refreshCookieOptions }