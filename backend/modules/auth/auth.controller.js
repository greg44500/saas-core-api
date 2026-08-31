import {
    refreshCookieName,
    refreshCookieOptions,
} from '../../config/cookie.config.js';

import { revokeCurrentAuthSession, rotateAuthSession, revokeAllUserAuthSessions, } from '../authSessions/authSession.service.js';

import {
    changeUserPassword,
    forgotUserPassword,
    loginUser,
    registerUser,
    resetUserPassword,
} from './auth.service.js';

import { signAccessToken } from '../../utils/jwt.js';


/**
 * Construit le DTO public commun aux réponses Auth.
 *
 * platformRole est exposé car le frontend doit pouvoir distinguer le contexte
 * Platform du contexte Workspace sans lire de données administratives lourdes.
 * Les champs internes du User restent exclus explicitement.
 */
const toAuthUserDto = (user) => ({
    id: user._id?.toString?.() ?? user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    platformRole: user.platformRole,
});


/**
 * Inscrit un nouvel utilisateur avec une identité locale.
 *
 * La validation et la logique métier sont volontairement déléguées
 * aux couches dédiées. Le controller traduit uniquement le résultat
 * du service en réponse HTTP.
 */
export const register = async (req, res) => {
    const user = await registerUser(req.validated.body);

    res.status(201).json({
        status: 'success',
        data: {
            user: toAuthUserDto(user),
        },
    });
};


/**
 * Authentifie un utilisateur avec son identité locale.
 *
 * Le service vérifie les credentials et crée la première
 * AuthSession.
 *
 * Le controller reste responsable du transport HTTP :
 * - création de l'access token ;
 * - écriture du refresh token dans le cookie HttpOnly ;
 * - construction de la réponse publique.
 */
export const login = async (req, res) => {
    const {
        user,
        refreshToken,
    } = await loginUser({
        ...req.validated.body,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    // L'access token reste volontairement indépendant
    // de l'AuthSession et contient uniquement l'identité minimale.
    const accessToken = signAccessToken(
        String(user._id),
        user.passwordChangedAt ?? null,
    );

    // Le refresh token brut n'est jamais retourné dans le JSON.
    // Le navigateur le reçoit uniquement via ce cookie HttpOnly.
    res.cookie(
        refreshCookieName,
        refreshToken,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        data: {
            user: toAuthUserDto(user),
            accessToken,
        },
    });
};

/**
 * Traite une demande publique de réinitialisation de mot de passe.
 */
export const forgotPassword = async (req, res) => {
    const { message } = await forgotUserPassword({
        email: req.validated.body.email,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        message,
    });
};

/**
 * Réinitialise le mot de passe à partir d'un token public valide.
 */
export const resetPassword = async (req, res) => {
    await resetUserPassword({
        token: req.validated.body.token,
        newPassword:
            req.validated.body.newPassword,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        message:
            'Mot de passe réinitialisé avec succès.',
    });
};

/**
 * Renouvelle la session d'authentification.
 */
export const refresh = async (req, res) => {
    const currentRefreshToken =
        req.cookies?.[refreshCookieName];

    const {
        user,
        refreshToken: nextRefreshToken,
    } = await rotateAuthSession({
        refreshToken: currentRefreshToken,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const accessToken = signAccessToken(
        String(user._id),
        user.passwordChangedAt ?? null,
    );

    res.cookie(
        refreshCookieName,
        nextRefreshToken,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        data: {
            user: toAuthUserDto(user),
            accessToken,
        },
    });
};

/**
 * Déconnecte la session correspondant au refresh token courant.
 */
export const logout = async (req, res) => {
    const currentRefreshToken =
        req.cookies?.[refreshCookieName];

    await revokeCurrentAuthSession({
        refreshToken: currentRefreshToken,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

/**
 * Révoque toutes les sessions actives de l'utilisateur authentifié.
 */
export const logoutAll = async (req, res) => {
    await revokeAllUserAuthSessions({
        userId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

/**
 * Modifie le mot de passe de l'utilisateur authentifié.
 */
export const changePassword = async (req, res) => {
    await changeUserPassword({
        userId: req.user.id,
        currentPassword:
            req.validated.body.currentPassword,
        newPassword:
            req.validated.body.newPassword,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

/**
 * Retourne le profil public du User actuellement authentifié.
 *
 * `authenticate` a déjà vérifié l'access token et chargé le User dans req.user.
 */
export const me = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: toAuthUserDto(req.user),
        },
    });
};

export { toAuthUserDto };
