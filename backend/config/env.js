import 'dotenv/config';
import { z } from 'zod';

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