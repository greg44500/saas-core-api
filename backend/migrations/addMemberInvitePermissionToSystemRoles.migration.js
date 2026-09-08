import { CORE_PERMISSION } from '../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../constants/role.constants.js';
import { Role } from '../modules/role/role.model.js';

/**
 * Ajoute `member:invite` aux rôles système capables d'administrer l'équipe.
 *
 * Les rôles système sont persistés par workspace : une évolution du registre
 * applicatif ne met donc pas automatiquement à niveau les tenants existants.
 * Après exécution, seuls owner et admin reçoivent la nouvelle permission.
 *
 * Les rôles personnalisés restent volontairement inchangés pour préserver les
 * choix d'autorisation propres à chaque workspace. `$addToSet` rend la migration
 * idempotente et permet de la rejouer sans dupliquer la permission.
 *
 * @returns {Promise<{matchedRoles: number, updatedRoles: number}>}
 * Résumé des rôles système examinés et effectivement modifiés.
 */
const migrateMemberInvitePermissionToSystemRoles = async () => {
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
                permissions: CORE_PERMISSION.MEMBER_INVITE,
            },
        },
    );

    return {
        matchedRoles: result.matchedCount,
        updatedRoles: result.modifiedCount,
    };
};

export { migrateMemberInvitePermissionToSystemRoles };
