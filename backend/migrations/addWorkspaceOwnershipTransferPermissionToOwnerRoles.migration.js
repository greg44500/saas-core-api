import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';


/**
 * Ajoute la permission de transfert de propriété uniquement aux rôles owner
 * système déjà persistés.
 *
 * Les rôles système sont clonés dans chaque workspace. Une évolution des
 * constantes ne met donc pas à niveau les workspaces existants. `$addToSet`
 * garantit que la migration reste idempotente.
 */
const migrateWorkspaceOwnershipTransferPermissionToOwnerRoles = async () => {
    const result = await Role.collection.updateMany(
        {
            isSystem: true,
            key: SYSTEM_ROLE_KEY.OWNER,
        },
        {
            $addToSet: {
                permissions:
                    CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};


export {
    migrateWorkspaceOwnershipTransferPermissionToOwnerRoles,
};
