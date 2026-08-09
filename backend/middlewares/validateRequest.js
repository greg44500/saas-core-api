import { AppError } from '../utils/AppError.js';

/**
 * Valide les différentes parties d'une requête HTTP avant
 * qu'elles n'atteignent le controller.
 *
 * Les données validées sont placées dans req.validated afin que
 * les couches suivantes travaillent uniquement avec des données
 * déjà contrôlées.
 *
 * @param {object} schemas
 * @param {import('zod').ZodType} [schemas.body]
 * @param {import('zod').ZodType} [schemas.params]
 * @param {import('zod').ZodType} [schemas.query]
 */
export const validateRequest = (schemas) => {
    return (req, res, next) => {
        const validated = {};

        for (const key of ['body', 'params', 'query']) {
            const schema = schemas[key];

            if (!schema) {
                continue;
            }

            const result = schema.safeParse(req[key]);

            if (!result.success) {
                return next(
                    new AppError(
                        `Données de requête invalides : ${key}`,
                        400,
                    ),
                );
            }

            validated[key] = result.data; // Représente la sortie réelle des données après Zod
        }

        req.validated = validated;

        next();
    };
};