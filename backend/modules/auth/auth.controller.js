import {
    refreshCookieName,
    refreshCookieOptions,
} from '../../config/cookie.config.js';

import { revokeCurrentAuthSession, rotateAuthSession, revokeAllUserAuthSessions, } from '../authSessions/authSession.service.js';

import {
    changeUserPassword,
    loginUser,
    registerUser,
} from './auth.service.js';

import { signAccessToken } from '../../utils/jwt.js';


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
            user: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt,
            },
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
            user: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt,
            },
            accessToken,
        },
    });
};


/**
 * Renouvelle la session d'authentification.
 *
 * Le refresh token courant est lu depuis le cookie HttpOnly.
 *
 * rotateAuthSession() porte toute la logique de sécurité :
 * - validation de la session ;
 * - expiration ;
 * - statut du User ;
 * - consommation unique ;
 * - rotation S1 -> S2 ;
 * - reuse detection ;
 * - compromission éventuelle de la famille.
 *
 * Le controller ne fait ensuite que :
 * - générer un nouvel access token ;
 * - remplacer le cookie par le nouveau refresh token ;
 * - retourner le User public et l'access token.
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

    // Chaque refresh réussi produit également
    // un nouvel access token court.
    const accessToken = signAccessToken(
        String(user._id),
        user.passwordChangedAt ?? null,
    );

    // Le nouveau refresh token R2 remplace R1
    // dans le même cookie HttpOnly.
    res.cookie(
        refreshCookieName,
        nextRefreshToken,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt,
            },
            accessToken,
        },
    });
};

/**
 * Déconnecte la session correspondant au refresh token courant.
 *
 * Le logout est idempotent :
 * - un cookie absent ne provoque pas d'erreur ;
 * - une session déjà révoquée ne provoque pas d'erreur ;
 * - le cookie est supprimé après la tentative de révocation.
 *
 * Le controller reste responsable du transport HTTP.
 * La révocation de l'AuthSession appartient au service dédié.
 */
export const logout = async (req, res) => {
    const currentRefreshToken =
        req.cookies?.[refreshCookieName];

    await revokeCurrentAuthSession({
        refreshToken: currentRefreshToken,
    });

    /*
     * La suppression doit utiliser les mêmes caractéristiques
     * de cookie, notamment son path, afin que le navigateur
     * cible bien le cookie créé lors du login/refresh.
     */
    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

export const logoutAll = async (req, res) => {
    await revokeAllUserAuthSessions({
        userId: req.user.id,
    });
    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );
    res.status(204).send()
}

/**
 * Modifie le mot de passe de l'utilisateur authentifié.
 *
 * Le service vérifie le mot de passe actuel, modifie le hash
 * et révoque toutes les AuthSession dans une transaction.
 *
 * Le controller supprime ensuite le refresh token du navigateur.
 * Une nouvelle authentification sera nécessaire.
 */
export const changePassword = async (req, res) => {
    await changeUserPassword({
        userId: req.user.id,
        currentPassword:
            req.validated.body.currentPassword,
        newPassword:
            req.validated.body.newPassword,
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
 * `authenticate` a déjà vérifié l'access token et chargé le User
 * dans `req.user`. Aucun nouvel accès MongoDB n'est nécessaire ici.
 */
export const me = async (req, res) => {
    const user = req.user;

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                emailVerifiedAt: user.emailVerifiedAt,
            },
        },
    });
};