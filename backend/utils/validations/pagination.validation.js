import { z } from 'zod';


/**
 * Valide les paramètres de pagination standards de l'API.
 *
 * Les valeurs provenant de req.query sont des chaînes.
 * coerce permet donc leur conversion explicite en nombres
 * avant leur transmission aux services.
 */
const paginationQuerySchema = z.strictObject({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
});


export {
    paginationQuerySchema,
};