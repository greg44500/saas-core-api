import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    login,
    logout,
    logoutAll,
    me,
    refresh,
    register,
} from './auth.controller.js';
import {
    loginSchema,
    registerSchema,
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
 * Retourne l'utilisateur actuellement authentifié.
 */
router.get(
    '/me',
    authenticate,
    me,
);

export { router as authRouter };