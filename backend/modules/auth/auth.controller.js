import { registerUser } from './auth.service.js';

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