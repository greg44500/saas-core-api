import {
    SYSTEM_ROLE_DEFINITIONS,
} from '../../constants/role.constants.js';
import { Role } from '../../modules/role/role.model.js';


/**
 * Crée les rôles système appartenant à un nouveau workspace.
 *
 * Cette fonction doit être appelée depuis la transaction responsable
 * de la création complète du workspace.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId} params.workspaceId
 * @param {import('mongoose').Types.ObjectId} params.actorId
 * @param {import('mongoose').ClientSession} params.session
 * @returns {Promise<Array>}
 */
const createSystemRolesForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    // Une session est obligatoire afin d’éviter la création de rôles
    // en dehors de la transaction du workspace.
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create system roles',
        );
    }

    const rolesToCreate = SYSTEM_ROLE_DEFINITIONS.map((definition) => ({
        workspace: workspaceId,
        key: definition.key,
        name: definition.name,
        description: definition.description,

        // Une nouvelle copie empêche Mongoose ou le document créé
        // de partager le tableau figé de la configuration globale.
        permissions: [...definition.permissions],

        isSystem: definition.isSystem,
        isEditable: definition.isEditable,
        createdBy: actorId,
        updatedBy: actorId,
    }));

    return Role.insertMany(rolesToCreate, {
        session,
    });
};

/**
 * Liste les rôles appartenant à un workspace.
 *
 * Cette lecture est protégée par role:read au niveau de la route. Les
 * permissions sont exposées afin que le frontend puisse expliquer précisément
 * ce qu'un rôle accorde avant une invitation ou une modification de membre.
 */
const listWorkspaceRoles = async ({ workspaceId }) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to list workspace roles',
        );
    }

    const roles = await Role.find({
        workspace: workspaceId,
    })
        .select('_id key name description permissions isSystem isEditable')
        .sort({ isSystem: -1, name: 1, _id: 1 })
        .lean();

    return roles.map((role) => ({
        id: role._id.toString(),
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        permissions: Array.isArray(role.permissions)
            ? [...role.permissions]
            : [],
        isSystem: role.isSystem,
        isEditable: role.isEditable,
    }));
};


export {
    createSystemRolesForWorkspace,
    listWorkspaceRoles,
};
