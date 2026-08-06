import { env } from './env.js';

const isProduction = env.NODE_ENV === 'production';

const helmetOptions = Object.freeze({
    contentSecurityPolicy: {
        directives: {
            upgradeInsecureRequests: isProduction ? [] : null,
        },
    },

    strictTransportSecurity: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: false,
        }
        : false,
});

export { helmetOptions };