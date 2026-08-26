import { AppError } from '../utils/appError.js';


/**
 * Vérifie que l'utilisateur authentifié possède l'un des rôles
 * plateforme explicitement autorisés.
 *
 * Ce middleware doit être utilisé après authenticate, qui est
 * responsable de charger le User courant dans req.user.
 *
 * Les rôles plateforme sont volontairement séparés des rôles
 * et permissions propres aux workspaces.
 *
 * @param {...string} allowedRoles
 * @returns {import('express').RequestHandler}
 */
const authorizePlatformRole = (...allowedRoles) => {
    return (req, res, next) => {
        /*
         * L'absence de User signifie que la chaîne de middlewares
         * n'a pas été correctement construite.
         *
         * L'accès est refusé par défaut plutôt que de tenter
         * d'interpréter un contexte incomplet.
         */
        if (!req.user) {
            return next(
                new AppError(
                    'Contexte utilisateur indisponible',
                    403,
                ),
            );
        }

        /*
         * Le rôle plateforme courant provient du User rechargé
         * depuis MongoDB par authenticate.
         *
         * Le JWT n'est donc pas utilisé comme source de vérité
         * pour l'autorisation plateforme.
         */
        if (
            !allowedRoles.includes(
                req.user.platformRole,
            )
        ) {
            return next(
                new AppError(
                    'Accès plateforme non autorisé',
                    403,
                ),
            );
        }

        next();
    };
};


export { authorizePlatformRole };