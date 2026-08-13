import { env } from './env.js';

const smtpConfig = Object.freeze({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
    },
});

const emailSender = Object.freeze({
    address: env.SMTP_FROM_EMAIL,
    name: env.SMTP_FROM_NAME,
});

export { smtpConfig, emailSender };