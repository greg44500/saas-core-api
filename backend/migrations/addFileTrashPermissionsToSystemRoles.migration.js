import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Réconcilie les rôles système d'administration créés avant D-002.
 *
 * Les nouveaux workspaces reçoivent automatiquement ces permissions via le
 * registre CORE_PERMISSION. Cette migration ne touche que owner/admin existants
 * et reste idempotente grâce à `$addToSet` + `$each`.
 */
const migrateFileTrashPermissionsToSystemRoles = async () => {
    const result = await Role.collection.updateMany(
        {
            isSystem: true,
            key: {
                $in: [
                    SYSTEM_ROLE_KEY.OWNER,
                    SYSTEM_ROLE_KEY.ADMIN,
                ],
            },
        },
        {
            $addToSet: {
                permissions: {
                    $each: [
                        CORE_PERMISSION.FILE_TRASH_READ,
                        CORE_PERMISSION.FILE_RESTORE,
                        CORE_PERMISSION.FILE_DELETE_PERMANENTLY,
                    ],
                },
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};

export { migrateFileTrashPermissionsToSystemRoles };
