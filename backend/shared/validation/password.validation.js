import { z } from 'zod';

import {
    PASSWORD_POLICY,
    validateNewPasswordAgainstPolicy,
} from '../security/passwordPolicy.js';

/**
 * Valide un secret présenté pour authentification.
 *
 * Ce schéma ne doit pas appliquer la politique des nouveaux mots de passe :
 * un compte existant doit pouvoir présenter son credential courant même si la
 * politique a été renforcée depuis sa création.
 */
const passwordCredentialSchema = z
    .string()
    .min(1)
    .max(PASSWORD_POLICY.maxLength);

/**
 * Valide tout nouveau mot de passe créé par register/change/reset.
 *
 * La politique appartient exclusivement au backend. Le frontend peut exposer
 * une représentation publique de ces règles, mais la décision finale reste ici.
 */
const newPasswordSchema = z
    .string()
    .min(PASSWORD_POLICY.minLength)
    .max(PASSWORD_POLICY.maxLength)
    .superRefine((password, context) => {
        const result = validateNewPasswordAgainstPolicy(password);

        for (const reason of result.reasons) {
            if (['too_short', 'too_long'].includes(reason)) {
                continue;
            }

            context.addIssue({
                code: 'custom',
                message: 'Le mot de passe est trop prévisible. Choisissez une phrase de passe plus difficile à deviner.',
            });
        }
    });

// Alias conservé pour les modules qui définissent un nouveau mot de passe.
const passwordSchema = newPasswordSchema;

export {
    newPasswordSchema,
    passwordCredentialSchema,
    passwordSchema,
};
