import { z } from 'zod';


/**
 * Valide l'identifiant MongoDB d'une souscription administrée via Platform.
 */
const platformSubscriptionIdParamsSchema = z.strictObject({
    subscriptionId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'subscriptionId invalide',
        ),
});


export {
    platformSubscriptionIdParamsSchema,
};