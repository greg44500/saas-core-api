import { z } from 'zod';

import {
    passwordSchema,
} from '../auth/auth.validation.js';


const objectIdSchema = z
    .string()
    .regex(
        /^[a-f\d]{24}$/i,
        'Identifiant MongoDB invalide',
    );


/**
 * Valide les données nécessaires au transfert de propriété.
 *
 * currentPassword fournit une confirmation renforcée de l'owner avant cette
 * opération sensible. Le secret n'est pas trimé et réutilise la politique
 * d'authentification locale existante.
 *
 * Les règles métier (membre actif, rôle du même workspace, rôle non-owner)
 * restent volontairement dans le service transactionnel.
 */
const transferWorkspaceOwnershipBodySchema = z.strictObject({
    newOwnerMemberId: objectIdSchema,
    previousOwnerRoleId: objectIdSchema,
    currentPassword: passwordSchema,
});


export {
    transferWorkspaceOwnershipBodySchema,
};
