import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Ajoute la permission de lecture Subscription aux rôles système qui
 * administrent le workspace.
 *
 * Les rôles étant persistés à la création du workspace, modifier seulement les
 * constantes applicatives ne mettrait pas à niveau les tenants existants. Cette
 * migration utilise `$addToSet` afin de rester idempotente.
 */
const migrateSubscriptionReadPermissionToSystemRoles = async () => {
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
                permissions: CORE_PERMISSION.SUBSCRIPTION_READ,
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};

export { migrateSubscriptionReadPermissionToSystemRoles };