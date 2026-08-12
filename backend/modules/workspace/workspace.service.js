import mongoose from 'mongoose';

import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../constants/workspace.constants.js';

import { createSystemRolesForWorkspace } from '../role/role.service.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { Workspace } from './workspace.model.js';


/**
 * Crée un workspace complet et attribue automatiquement le rôle owner
 * à l'utilisateur qui en est à l'origine.
 *
 * La création du workspace, des rôles système et du membership owner
 * constitue une seule opération atomique.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {import('mongoose').Types.ObjectId} params.actorId
 * @returns {Promise<import('mongoose').Document>}
 */
const createWorkspace = async ({
    name,
    actorId,
}) => {
    if (!name || !actorId) {
        throw new TypeError(
            'name and actorId are required to create a workspace',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        /*
         * Model.create reçoit un tableau afin que Mongoose applique
         * correctement la session transactionnelle à cette création.
         */
        const [workspace] = await Workspace.create(
            [
                {
                    name,
                    statusChangedBy: actorId,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ],
            {
                session,
            },
        );

        const systemRoles = await createSystemRolesForWorkspace({
            workspaceId: workspace._id,
            actorId,
            session,
        });

        const ownerRole = systemRoles.find(
            (role) => role.key === SYSTEM_ROLE_KEY.OWNER,
        );

        /*
         * L'absence du rôle owner constitue une incohérence interne critique.
         * Lever une erreur ici force l'annulation de toute la transaction.
         */
        if (!ownerRole) {
            throw new Error(
                'Owner system role was not created for the workspace',
            );
        }

        await WorkspaceMember.create(
            [
                {
                    workspace: workspace._id,
                    user: actorId,
                    role: ownerRole._id,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ],
            {
                session,
            },
        );

        return workspace;
    });
};


/**
 * Modifie le nom d'un workspace actif.
 *
 * Le filtre sur le statut est volontairement répété ici même si
 * loadWorkspaceContext a déjà vérifié que le workspace était actif.
 *
 * Cette seconde vérification protège l'écriture contre un changement
 * administratif intervenu entre le middleware et l'opération MongoDB.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} params.workspaceId
 * @param {string} params.name
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @returns {Promise<import('mongoose').Document|null>}
 */
const updateWorkspace = async ({
    workspaceId,
    name,
    actorId,
}) => {
    if (!workspaceId || !name || !actorId) {
        throw new TypeError(
            'workspaceId, name and actorId are required to update a workspace',
        );
    }

    return Workspace.findOneAndUpdate(
        {
            _id: workspaceId,
            status: WORKSPACE_STATUS.ACTIVE,
        },
        {
            $set: {
                name,
                updatedBy: actorId,
            },
        },
        {
            new: true,
            runValidators: true,
        },
    );
};


export {
    createWorkspace,
    updateWorkspace,
};