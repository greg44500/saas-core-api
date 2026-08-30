import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Les rôles système déjà persistés ne récupèrent pas automatiquement les
 * nouvelles permissions ajoutées au registre applicatif.
 */
const migrateFileReadPermissionToSystemRoles = async () => {
    const result = await Role.collection.updateMany(
        {
            isSystem: true,
            key: {
                $in: Object.values(SYSTEM_ROLE_KEY),
            },
        },
        {
            $addToSet: {
                permissions: CORE_PERMISSION.FILE_READ,
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};

export { migrateFileReadPermissionToSystemRoles };
