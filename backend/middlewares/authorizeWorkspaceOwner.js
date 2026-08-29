import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { AppError } from '../utils/appError.js';

/**
 * Réserve une action sensible au propriétaire système du workspace courant.
 *
 * Cette barrière est volontairement indépendante des permissions configurables :
 * un rôle personnalisé ou administrateur ne doit jamais pouvoir obtenir par
 * délégation le pouvoir d'engager, modifier ou résilier le contrat commercial
 * du propriétaire.
 *
 * Le middleware doit être placé après loadWorkspaceContext, qui garantit la
 * cohérence entre workspace, membership et rôle.
 */
const authorizeWorkspaceOwner = (req, res, next) => {
    if (!req.role) {
        return next(
            new AppError(
                'Contexte de rôle indisponible',
                403,
            ),
        );
    }

    if (
        req.role.key !== SYSTEM_ROLE_KEY.OWNER
        || req.role.isSystem !== true
    ) {
        return next(
            new AppError(
                'Cette action est réservée au propriétaire du workspace',
                403,
            ),
        );
    }

    next();
};

export { authorizeWorkspaceOwner };
