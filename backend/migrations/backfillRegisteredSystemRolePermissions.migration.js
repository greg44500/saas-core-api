import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';
import {
    getActiveRolePermissionRegistry,
} from '../modules/role/rolePermission.registry.js';


const SYSTEM_ROLE_ORDER = Object.freeze(
    Object.values(SYSTEM_ROLE_KEY),
);


/**
 * Ajoute aux rôles système déjà persistés les permissions applicatives
 * déclarées dans le registre RBAC actif.
 *
 * La migration est générique : aucune permission métier n'est connue du Core.
 * `$addToSet` + `$each` garantit l'idempotence et les rôles personnalisés ne
 * sont jamais modifiés.
 */
const backfillRegisteredSystemRolePermissions = async ({
    permissionRegistry = null,
} = {}) => {
    const activeRegistry =
        permissionRegistry ?? getActiveRolePermissionRegistry();

    let matchedRoles = 0;
    let updatedRoles = 0;

    for (const roleKey of SYSTEM_ROLE_ORDER) {
        const permissions =
            activeRegistry.systemRolePermissions[roleKey] ?? [];

        if (permissions.length === 0) {
            continue;
        }

        const result = await Role.collection.updateMany(
            {
                isSystem: true,
                key: roleKey,
            },
            {
                $addToSet: {
                    permissions: {
                        $each: [...permissions],
                    },
                },
            },
        );

        matchedRoles += result.matchedCount;
        updatedRoles += result.modifiedCount;
    }

    return {
        matchedRoles,
        updatedRoles,
    };
};


export { backfillRegisteredSystemRolePermissions };
