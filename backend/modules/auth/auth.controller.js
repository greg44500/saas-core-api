import {
    registerUser,
    loginUser,
} from './auth.service.js';

import {
    refreshCookieName,
    refreshCookieOptions,
} from '../../config/cookie.config.js';

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
 * Le controller :
 * - transmet au service les credentials validés ;
 * - transmet le contexte HTTP utile à la session ;
 * - génère l'Access Token ;
 * - place le Refresh Token dans un cookie HttpOnly ;
 * - ne renvoie jamais le Refresh Token dans le JSON.
 */
export const login = async (req, res) => {
    const {
        ipAddress = null,
        userAgent = null,
    } = req.context ?? {};

    const {
        user,
        refreshToken,
    } = await loginUser({
        ...req.validated.body,
        ipAddress,
        userAgent,
    });

    // Le claim JWT "sub" doit être une chaîne.
    // On convertit explicitement l'identifiant MongoDB afin que le contrat
    // du helper JWT ne dépende pas du type renvoyé par Mongoose.
    const accessToken = signAccessToken(String(user._id));

    // Le refresh token brut n'est jamais renvoyé dans le JSON.
    // Il est uniquement transmis au navigateur dans un cookie HttpOnly.
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