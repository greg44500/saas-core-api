import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Ajoute la permission de lecture AuditLog aux rôles système responsables
 * de l'administration du workspace.
 *
 * Les rôles étant persistés à la création du workspace, modifier uniquement
 * les constantes applicatives ne mettrait pas à niveau les tenants existants.
 * `$addToSet` garantit que la migration reste idempotente.
 */
const migrateAuditReadPermissionToSystemRoles = async () => {
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
                permissions: CORE_PERMISSION.AUDIT_READ,
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};

export { migrateAuditReadPermissionToSystemRoles };
