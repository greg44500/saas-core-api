import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Ajoute `file:read` aux rôles système déjà persistés dans les workspaces.
 *
 * Avant cette migration, les workspaces créés avant l'introduction de la
 * permission peuvent conserver des rôles système sans `file:read`, même si le
 * registre applicatif courant l'accorde désormais. Après exécution, tous les
 * rôles système connus reçoivent cette permission.
 *
 * Les rôles personnalisés sont volontairement exclus : leur politique reste
 * sous le contrôle de l'administrateur du workspace. `$addToSet` rend la
 * migration idempotente et sûre à rejouer sans dupliquer la permission.
 *
 * @returns {Promise<{matchedRoles: number, updatedRoles: number}>}
 * Résumé des rôles système examinés et effectivement modifiés.
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
