import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    validateEnvironment,
} from '../../config/env.js';

const createValidEnvironment = (overrides = {}) => ({
    NODE_ENV: 'test',
    PORT: '5000',
    CLIENT_URL: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/saas-core-api?replicaSet=rs0',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_ACCESS_ISSUER: 'saas-core-api',
    JWT_ACCESS_AUDIENCE: 'saas-core-api',
    REFRESH_TOKEN_EXPIRES_IN_DAYS: '7',
    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: '30',
    SMTP_HOST: 'smtp.test.local',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'smtp-user',
    SMTP_PASSWORD: 'smtp-password',
    SMTP_FROM_EMAIL: 'no-reply@test.local',
    SMTP_FROM_NAME: 'SAAS Core',
    UPLOAD_MAX_FILE_SIZE_BYTES: '5242880',
    FILE_RETENTION_DAYS: '30',
    FILE_STORAGE_PROVIDER: 'local',
    LOCAL_STORAGE_ROOT_DIR: 'uploads/files',
    UPLOAD_TEMP_DIR: 'uploads/tmp',
    CLAMAV_BINARY_PATH: 'clamscan',
    CLAMAV_SCAN_TIMEOUT_MS: '30000',
    UPLOAD_TEMP_FILE_MAX_AGE_MINUTES: '60',
    TRIAL_IDENTITY_SECRET: 'b'.repeat(32),
    ...overrides,
});

describe('validateEnvironment', () => {
    it('accepte une configuration de production sans placeholders', () => {
        const result = validateEnvironment(
            createValidEnvironment({
                NODE_ENV: 'production',
            }),
        );

        expect(result.success).toBe(true);
    });

    it.each([
        [
            'JWT_ACCESS_SECRET',
            'replace_with_a_long_random_secret',
        ],
        [
            'TRIAL_IDENTITY_SECRET',
            'replace_with_a_dedicated_long_random_secret',
        ],
        [
            'SMTP_USER',
            'your_smtp_username',
        ],
        [
            'SMTP_PASSWORD',
            'your_smtp_password',
        ],
    ])(
        'refuse le placeholder de %s en production',
        (field, placeholder) => {
            const result = validateEnvironment(
                createValidEnvironment({
                    NODE_ENV: 'production',
                    [field]: placeholder,
                }),
            );

            expect(result.success).toBe(false);

            if (result.success) {
                return;
            }

            expect(
                result.error.issues.some(
                    (issue) => issue.path[0] === field,
                ),
            ).toBe(true);
        },
    );

    it('autorise les valeurs d’exemple hors production pour faciliter le développement local', () => {
        const result = validateEnvironment(
            createValidEnvironment({
                NODE_ENV: 'development',
                JWT_ACCESS_SECRET:
                    'replace_with_a_long_random_secret',
                TRIAL_IDENTITY_SECRET:
                    'replace_with_a_dedicated_long_random_secret',
                SMTP_USER: 'your_smtp_username',
                SMTP_PASSWORD: 'your_smtp_password',
            }),
        );

        expect(result.success).toBe(true);
    });
});
