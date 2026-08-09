import { z } from 'zod';
import { userIdentityInputSchema } from '../users/user.validation.js';
/**
 * Valide uniquement la structure HTTP d'un mot de passe.
 *
 * Le mot de passe n'est volontairement pas trimé :
 * les espaces peuvent faire partie du secret choisi par l'utilisateur.
 *
 * Les règles de composition artificielles comme l'obligation d'une
 * majuscule, d'un chiffre ou d'un symbole ne font pas partie
 * de la politique de sécurité retenue pour le projet.
 */
export const passwordSchema = z.string().min(15).max(128);
/**
 * Contrat HTTP utilisé lors de l'inscription locale.
 *
 * Les données d'identité restent définies dans le module User afin
 * de conserver une seule source de vérité pour leur validation.
 *
 * Le client ne peut fournir ici que les données explicitement
 * nécessaires à la création d'un compte local.
 */
export const registerSchema = userIdentityInputSchema.extend({
    password: passwordSchema,
});
/**
 * Contrat HTTP utilisé lors d'une authentification locale.
 *
 * Aucun champ interne comme userId, provider ou passwordHash
 * ne doit pouvoir être fourni par le client.
 */
export const loginSchema = z.strictObject({
    email: z.email().max(254),
    password: passwordSchema,
})