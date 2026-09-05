import { z } from 'zod';

import { passwordSchema } from '../../shared/validation/password.validation.js';
import { userIdentityInputSchema } from '../users/user.validation.js';

/**
 * Réexporte la primitive partagée afin de conserver l'API existante du
 * module Auth sans dupliquer la politique de mot de passe.
 */
export { passwordSchema };

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
});

/**
 * Contrat HTTP utilisé pour modifier le mot de passe
 * de l'utilisateur authentifié.
 *
 * La vérification du mot de passe actuel et l'interdiction
 * de réutiliser le même mot de passe appartiennent au service.
 */
export const changePasswordSchema = z.strictObject({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
});

/**
 * Contrat HTTP utilisé pour demander une réinitialisation
 * de mot de passe.
 *
 * Cette validation vérifie uniquement la forme de l'adresse email
 * fournie par le client.
 *
 * L'existence du compte, la présence d'une identité locale
 * et l'état du User ne sont volontairement pas vérifiés ici :
 * ces décisions appartiennent au service forgotUserPassword().
 *
 * Cette séparation est importante pour conserver une réponse publique
 * identique qu'un compte existe ou non et éviter l'énumération
 * des utilisateurs.
 *
 * strictObject() interdit également tout champ supplémentaire
 * non prévu par le contrat HTTP.
 */
export const forgotPasswordSchema = z.strictObject({
    email: z.email().max(254),
});

/**
 * Contrat HTTP utilisé pour réinitialiser un mot de passe
 * à partir d'un token de récupération.
 *
 * Le token est traité comme une valeur opaque :
 * la validation HTTP contrôle uniquement qu'il s'agit
 * d'une chaîne non vide de taille raisonnable.
 *
 * Sa validité réelle (existence, expiration, révocation,
 * usage antérieur) appartient au service métier.
 *
 * Le nouveau mot de passe réutilise passwordSchema afin
 * de conserver une politique unique pour register,
 * change-password et reset-password.
 *
 * strictObject() interdit notamment qu'un client fournisse
 * lui-même un userId, un email ou tout autre champ interne.
 */
export const resetPasswordSchema = z.strictObject({
    token: z.string().min(1).max(256),
    newPassword: passwordSchema,
});