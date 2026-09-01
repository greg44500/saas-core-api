import { Role } from '../modules/role/role.model.js';
import { AppError } from '../utils/appError.js';

/**
 * Vérifie qu'un acteur ne délègue jamais, via un rôle cible, une permission
 * qu'il ne possède pas lui-même dans le workspace courant.
 *
 * Ce contrôle intervient après loadWorkspaceContext et authorizePermission :
 * req.permissions est donc la source autoritative des permissions effectives
 * de l'acteur pour ce tenant.
 */
const authorizeRoleDelegation = async (req, res, next) => {
    const workspaceId = req.workspace?._id;
    const roleId = req.validated?.body?.roleId;

    if (!workspaceId || !roleId) {
        return next(
            new AppError(
                'Contexte de délégation de rôle indisponible',
                403,
            ),
        );
    }

    if (!Array.isArray(req.permissions)) {
        return next(
            new AppError(
                'Contexte de permissions indisponible',
                403,
            ),
        );
    }

    const targetRole = await Role.findOne({
        _id: roleId,
        workspace: workspaceId,
    }).select('permissions');

    if (!targetRole) {
        return next(
            new AppError(
                'Rôle introuvable dans ce workspace.',
                404,
            ),
        );
    }

    if (!Array.isArray(targetRole.permissions)) {
        return next(
            new AppError(
                'Permissions du rôle cible indisponibles',
                403,
            ),
        );
    }

    const actorPermissions = new Set(req.permissions);
    const nonDelegablePermissions = targetRole.permissions.filter(
        (permission) => !actorPermissions.has(permission),
    );

    if (nonDelegablePermissions.length > 0) {
        return next(
            new AppError(
                'Vous ne pouvez pas attribuer un rôle contenant des permissions que vous ne possédez pas.',
                403,
            ),
        );
    }

    next();
};

export { authorizeRoleDelegation };
