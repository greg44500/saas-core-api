import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    changePassword,
    forgotPassword,
    login,
    logout,
    logoutAll,
    me,
    refresh,
    register,
    resetPassword,
} from './auth.controller.js';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
} from './auth.validation.js';

const router = Router();

/**
 * Inscription locale.
 *
 * La validation intervient avant le controller afin que celui-ci
 * ne reçoive que des données conformes au contrat HTTP.
 */
router.post(
    '/register',
    validateRequest({ body: registerSchema }),
    register,
);

/**
 * Authentification locale.
 */
router.post(
    '/login',
    validateRequest({ body: loginSchema }),
    login,
);

/**
 * Demande l'envoi d'un lien de réinitialisation du mot de passe.
 *
 * Cette route reste publique : l'utilisateur qui a oublié
 * son mot de passe ne peut pas être supposé authentifié.
 *
 * Le body est strictement validé avant d'atteindre le controller.
 * La logique anti-énumération et l'éventuel envoi d'email
 * restent entièrement pris en charge par forgotUserPassword().
 */
router.post(
    '/forgot-password',
    validateRequest({
        body: forgotPasswordSchema,
    }),
    forgotPassword,
);

/**
 * Réinitialise le mot de passe à partir d'un token
 * reçu via le workflow forgot-password.
 *
 * Route publique :
 * le token de réinitialisation constitue ici la preuve
 * temporaire autorisant le changement du credential.
 *
 * validateRequest protège le contrat HTTP avant que
 * le controller puis le service ne soient exécutés.
 */
router.post(
    '/reset-password',
    validateRequest({
        body: resetPasswordSchema,
    }),
    resetPassword,
);

/**
 * Renouvelle la paire de tokens à partir du refresh token
 * contenu dans le cookie HttpOnly.
 *
 * Cette route ne doit pas utiliser authenticate :
 * l'access token peut justement être expiré au moment du refresh.
 *
 * Aucune validation de body n'est nécessaire puisque le refresh
 * token est lu directement depuis le cookie.
 */
router.post(
    '/refresh',
    refresh,
);

/**
 * Déconnecte la session courante à partir du refresh token
 * contenu dans le cookie HttpOnly.
 *
 * Cette route ne dépend pas de l'access token :
 * elle doit rester utilisable même si celui-ci est expiré.
 *
 * Aucun body n'est attendu, le refresh token étant lu
 * directement depuis le cookie.
 */
router.post(
    '/logout',
    logout)

/**
* Déconnecte l'utilisateur de toutes ses sessions actives.
*
* Cette route nécessite un access token valide afin d'identifier
* de manière fiable l'utilisateur concerné.
*
* Le controller révoque ensuite toutes ses AuthSession encore
* actives et supprime le refresh token du navigateur courant.
*/
router.post(
    '/logout-all',
    authenticate,
    logoutAll)

/**
 * Modifie le mot de passe de l'utilisateur authentifié.
 *
 * L'identité provient exclusivement de l'access token.
 * Le body contient uniquement le mot de passe actuel
 * et le nouveau mot de passe.
 *
 * Toutes les sessions sont révoquées après la modification.
 */
router.post(
    '/change-password',
    authenticate,
    validateRequest({
        body: changePasswordSchema,
    }),
    changePassword,
);

/**
 * Retourne l'utilisateur actuellement authentifié.
 */
router.get(
    '/me',
    authenticate,
    me,
);

export { router as authRouter };