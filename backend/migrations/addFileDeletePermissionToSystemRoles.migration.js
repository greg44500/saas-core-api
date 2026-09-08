import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Ajoute `file:delete` aux rôles système d'administration déjà persistés.
 *
 * Avant cette migration, les rôles owner/admin créés avant l'introduction de
 * la permission peuvent rester incomplets par rapport au registre applicatif.
 * Après exécution, seuls ces rôles système reçoivent la capacité de suppression.
 *
 * Les rôles personnalisés et le rôle utilisateur standard sont exclus afin de
 * ne pas élargir silencieusement leurs droits. `$addToSet` garantit un rejeu
 * idempotent sans duplication de permission.
 *
 * @returns {Promise<{matchedRoles: number, updatedRoles: number}>}
 * Résumé des rôles système examinés et effectivement modifiés.
 */
const migrateFileDeletePermissionToSystemRoles = async () => {
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
                permissions: CORE_PERMISSION.FILE_DELETE,
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};

export { migrateFileDeletePermissionToSystemRoles };
