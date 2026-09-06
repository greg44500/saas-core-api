import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    resolvePlatformAuthorization,
} from '../platformTeam/platformAuthorization.service.js';
import { User } from '../users/user.model.js';
import {
    getPlatformRolePermissionCatalog,
} from './platformRole.policy.js';


const getPlatformRolePermissionCatalogForActor = async ({ actorId }) => {
    if (!actorId) {
        throw new TypeError(
            'actorId is required to read the Platform permission catalog',
        );
    }

    const actor = await User.findById(actorId);

    if (!actor) {
        throw new AppError('Utilisateur acteur introuvable.', 403);
    }

    const authorization = await resolvePlatformAuthorization({
        user: actor,
    });

    if (!authorization.permissions?.includes(PLATFORM_PERMISSION.ROLES_READ)) {
        throw new AppError('Accès plateforme non autorisé', 403);
    }

    return getPlatformRolePermissionCatalog({ authorization });
};


export {
    getPlatformRolePermissionCatalogForActor,
};
