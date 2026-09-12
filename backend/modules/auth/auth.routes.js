import { Router } from 'express';
import {
    forgotPasswordEmailRateLimiter,
    forgotPasswordIpRateLimiter,
    loginEmailRateLimiter,
    loginIpRateLimiter,
    registerIpRateLimiter,
    resetPasswordIpRateLimiter,
} from '../../config/rateLimit.config.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    changePassword,
    forgotPassword,
    login,
    logout,
    logoutAll,
    me,
    passwordPolicy,
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
 * Expose la représentation publique de la politique de mot de passe.
 * Aucun secret utilisateur ne transite par cet endpoint.
 */
router.get(
    '/password-policy',
    passwordPolicy,
);

/**
 * Inscription locale.
 *
 * Le rate limiter IP précède volontairement la validation : un bot envoyant
 * des bodies invalides ne doit pas pouvoir contourner la protection contre la
 * création massive de comptes ou l'épuisement des ressources du endpoint.
 */
router.post(
    '/register',
    registerIpRateLimiter,
    validateRequest({ body: registerSchema }),
    register,
);

/**
 * Authentification locale.
 *
 * Les deux barrières précédant la validation limitent respectivement les
 * échecs provenant d'une même origine réseau et ceux visant une même identité.
 * Elles ne consultent pas la base utilisateurs.
 */
router.post(
    '/login',
    loginIpRateLimiter,
    loginEmailRateLimiter,
    validateRequest({ body: loginSchema }),
    login,
);

router.post(
    '/forgot-password',

    /*
     * Première barrière : limite le volume total de demandes
     * provenant d'une même origine réseau.
     *
     * Elle s'exécute avant la validation afin qu'un client
     * envoyant volontairement des bodies invalides ne puisse
     * pas contourner la protection anti-abus.
     */
    forgotPasswordIpRateLimiter,

    /*
     * Deuxième barrière : limite les demandes visant
     * une même adresse email, indépendamment de l'IP.
     *
     * Le limiter ne vérifie jamais si le compte existe :
     * il ne crée donc aucune fuite d'information utilisateur.
     */
    forgotPasswordEmailRateLimiter,

    validateRequest({
        body: forgotPasswordSchema,
    }),

    forgotPassword,
);

/**
 * Réinitialise le mot de passe à partir d'un token
 * reçu via le workflow forgot-password.
 *
 * Route publique : le token possède une forte entropie et reste la preuve
 * temporaire autorisant le changement du credential. Le rate limiter IP vise
 * l'abus volumétrique et s'exécute avant la validation du body.
 */
router.post(
    '/reset-password',
    resetPasswordIpRateLimiter,
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
    logout,
);

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
    logoutAll,
);

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
