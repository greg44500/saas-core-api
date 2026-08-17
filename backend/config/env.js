import 'dotenv/config';
import { z } from 'zod';
import { FILE_STORAGE_PROVIDER } from '../constants/file.constants.js';

//Schema de validation pour les variables d'environnement
const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),

    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_URL: z
        .url({
            protocol: /^http?$/,
            error: 'CLIENT_URL doit être une URL HTTP ou HTTPS valide',
        }),
    MONGODB_URI: z
        .string()
        .trim()
        .min(1, 'MONGODB_URI est obligatoire')
        .refine(
            (value) => /^mongodb(?:\+srv)?:\/\/.+/.test(value),
            'MONGODB_URI doit commencer par mongodb:// ou mongodb+srv://',
        ),

    JWT_ACCESS_SECRET: z
        .string()
        .min(32, 'JWT_ACCESS_SECRET doit contenir au minimum 32 caractères'),

    JWT_ACCESS_EXPIRES_IN: z
        .string()
        .default('15m'),

    JWT_ACCESS_ISSUER: z
        .string()
        .min(1)
        .default('saas-core-api'),

    JWT_ACCESS_AUDIENCE: z
        .string()
        .min(1)
        .default('saas-core-api'),

    REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce
        .number()
        .int()
        .min(1)
        .max(30)
        .default(7),

    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: z.coerce
        .number()
        .int()
        .min(5)
        .max(60)
        .default(30),

    SMTP_HOST: z
        .string()
        .trim()
        .min(1, 'SMTP_HOST est obligatoire'),

    SMTP_PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535),

    SMTP_SECURE: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true'),

    SMTP_USER: z
        .string()
        .trim()
        .min(1, 'SMTP_USER est obligatoire'),

    SMTP_PASSWORD: z
        .string()
        .min(1, 'SMTP_PASSWORD est obligatoire'),

    SMTP_FROM_EMAIL: z
        .email('SMTP_FROM_EMAIL doit être une adresse email valide'),

    SMTP_FROM_NAME: z
        .string()
        .trim()
        .min(1, 'SMTP_FROM_NAME est obligatoire'),

    UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce
        .number()
        .int()
        .positive(),

    FILE_RETENTION_DAYS: z.coerce
        .number()
        .int()
        .positive(),

    FILE_STORAGE_PROVIDER: z.literal(
        FILE_STORAGE_PROVIDER.LOCAL,
    ),

    LOCAL_STORAGE_ROOT_DIR: z
        .string()
        .trim()
        .min(
            1,
            'LOCAL_STORAGE_ROOT_DIR est obligatoire',
        ),

    UPLOAD_TEMP_DIR: z
        .string()
        .trim()
        .min(
            1,
            'UPLOAD_TEMP_DIR est obligatoire',
        ),

    CLAMAV_BINARY_PATH: z
        .string()
        .trim()
        .min(1, "CLAMAV_BINARY_PATH est obligatoire"),

    CLAMAV_SCAN_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(1000)
        .max(120000),

});
// Valider les variables d'environnement et les transformer en types appropriés
const validationResult = envSchema.safeParse(process.env);

if (!validationResult.success) {
    console.error(
        "La configuration de l'environnement est invalide.",
        z.flattenError(validationResult.error).fieldErrors,
    );

    process.exit(1);
}
// Geler l'objet pour éviter toute modification accidentelle
const env = Object.freeze(validationResult.data);

export { env }