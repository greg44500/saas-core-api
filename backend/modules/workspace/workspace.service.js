import mongoose from 'mongoose';

import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../constants/workspace.constants.js';

import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';

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
 * Retourne les workspaces actuellement accessibles à un utilisateur.
 *
 * Seuls les memberships actifs sont pris en compte.
 * Un workspace non actif ou un rôle incohérent rend le membership
 * inexploitable dans le contexte tenant et il n'est donc pas retourné.
 *
 * Le rôle est volontairement limité à key et name afin de fournir
 * au frontend le contexte nécessaire au filtrage sans exposer
 * les permissions ou les champs internes du Role.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Array<object>>}
 */
const listUserWorkspaces = async (userId) => {
    if (!userId) {
        throw new TypeError(
            'userId is required to list user workspaces',
        );
    }

    const memberships = await WorkspaceMember.find({
        user: userId,
        status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    })
        .select('_id workspace role')
        .populate({
            path: 'workspace',
            match: {
                status: WORKSPACE_STATUS.ACTIVE,
            },
            select: '_id name status createdAt updatedAt',
        })
        .populate({
            path: 'role',
            select: '_id key name workspace',
        })
        .lean();

    /*
     * populate({ match }) ne supprime pas le WorkspaceMember parent :
     * si le workspace ne correspond pas au filtre ACTIVE, workspace vaut null.
     *
     * On exclut également un rôle absent ou rattaché à un autre workspace,
     * car le contexte tenant serait alors incohérent.
     */
    return memberships
        .filter((membership) => {
            if (!membership.workspace || !membership.role) {
                return false;
            }

            return (
                membership.role.workspace?.toString()
                === membership.workspace._id.toString()
            );
        })
        .map((membership) => ({
            id: membership.workspace._id.toString(),
            name: membership.workspace.name,
            status: membership.workspace.status,
            membership: {
                id: membership._id.toString(),
                role: {
                    key: membership.role.key,
                    name: membership.role.name,
                },
            },
            createdAt: membership.workspace.createdAt,
            updatedAt: membership.workspace.updatedAt,
        }));
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
            returnDocument: 'after',
            runValidators: true,
        }
    );
};


export {
    createWorkspace,
    listUserWorkspaces,
    updateWorkspace,
};