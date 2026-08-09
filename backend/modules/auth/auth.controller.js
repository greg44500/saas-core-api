import {
    registerUser, loginUser,
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
 * Le controller ne vérifie ni l'email ni le mot de passe lui-même :
 * cette responsabilité appartient au service d'authentification.
 */
export const login = async (req, res) => {
    const user = await loginUser(req.validated.body);

    // Le claim JWT "sub" doit être une chaîne.
    // On convertit explicitement l'identifiant MongoDB afin que le contrat
    // du helper JWT ne dépende pas du type renvoyé par Mongoose.
    const accessToken = signAccessToken(String(user._id));

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
            accessToken,
        },
    });
};