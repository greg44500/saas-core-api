import { AppError } from '../utils/appError.js';


/**
 * Vérifie que le contexte workspace courant possède la permission requise.
 *
 * Ce middleware doit être utilisé après loadWorkspaceContext,
 * qui est responsable de charger et fiabiliser req.permissions.
 *
 * authorizePermission ne connaît volontairement ni les rôles,
 * ni le statut du workspace, ni le membership.
 */
const authorizePermission = (requiredPermission) => {
    return (req, res, next) => {
        /**
         * L'absence de tableau de permissions signifie que le contexte
         * d'autorisation n'a pas été correctement construit.
         *
         * On refuse donc l'accès par défaut plutôt que d'autoriser
         * une requête dans un état incohérent.
         */
        if (!Array.isArray(req.permissions)) {
            return next(
                new AppError(
                    'Contexte de permissions indisponible',
                    403,
                ),
            );
        }

        /**
         * Une permission représente une action précise.
         *
         * Le rôle n'est jamais interprété ici : seul le tableau
         * de permissions construit par loadWorkspaceContext fait foi.
         */
        if (!req.permissions.includes(requiredPermission)) {
            return next(
                new AppError(
                    'Permission insuffisante',
                    403,
                ),
            );
        }

        next();
    };
};


export { authorizePermission };