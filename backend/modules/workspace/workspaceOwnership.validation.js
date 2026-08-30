import { z } from 'zod';


const objectIdSchema = z
    .string()
    .regex(
        /^[a-f\d]{24}$/i,
        'Identifiant MongoDB invalide',
    );


/**
 * Valide les deux identifiants nécessaires au transfert de propriété.
 *
 * Les règles métier (membre actif, rôle du même workspace, rôle non-owner)
 * restent volontairement dans le service transactionnel.
 */
const transferWorkspaceOwnershipBodySchema = z.strictObject({
    newOwnerMemberId: objectIdSchema,
    previousOwnerRoleId: objectIdSchema,
});


export {
    transferWorkspaceOwnershipBodySchema,
};
