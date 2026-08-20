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
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    USER_STATUS,
} from '../../constants/userStatus.constants.js';

import { createSystemRolesForWorkspace } from '../role/role.service.js';
import {
    createFreeSubscriptionForWorkspace,
} from '../subscriptions/subscription.service.js';

import {
    createAuditLog,
} from '../auditLog/auditLog.service.js';

import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { Workspace } from './workspace.model.js';
import { Role } from '../role/role.model.js';
import { User } from '../users/user.model.js';


/**
 * Crée un workspace complet avec ses rôles système, son membre owner
 * et sa souscription gratuite initiale.
 *
 * Ces différentes écritures constituent une seule opération atomique :
 * l'échec de l'une d'elles doit annuler toute la création du workspace.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {import('mongoose').Types.ObjectId} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<import('mongoose').Document>}
 */
const createWorkspace = async ({
    name,
    actorId,
    ipAddress = null,
    userAgent = null,
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
        /*
         * La souscription gratuite fait partie de la même transaction.
         *
         * Si le plan free actif est absent ou si la souscription ne peut pas être
         * créée, la création du workspace, des rôles et du membership sera annulée.
         */
        await createFreeSubscriptionForWorkspace({
            workspaceId: workspace._id,
            actorId,
            session,
        });

        /*
 * La création du tenant et sa trace constituent une seule opération :
 * aucune structure partielle ne doit survivre à un échec d'audit.
 */
        await createAuditLog(
            {
                actor: actorId,
                workspace: workspace._id,
                action:
                    AUDIT_ACTION.WORKSPACE_CREATED,
                entityType:
                    AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: workspace._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
            },
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
 * Retourne les membres actuels d’un workspace avec pagination.
 *
 * Les memberships retirés et les comptes clôturés sont exclus.
 * Le rôle chargé doit appartenir au même workspace que le membership.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{
 *   members: Array<object>,
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }>}
 */
const listWorkspaceMembers = async ({
    workspaceId,
    page = 1,
    limit = 20,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to list workspace members',
        );
    }

    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError(
            'page must be an integer greater than or equal to 1',
        );
    }

    if (
        !Number.isInteger(limit)
        || limit < 1
        || limit > 100
    ) {
        throw new TypeError(
            'limit must be an integer between 1 and 100',
        );
    }

    /*
     * Mongoose ne convertit pas automatiquement les valeurs contenues
     * dans les étapes d’une agrégation.
     */
    const workspaceObjectId =
        new mongoose.Types.ObjectId(
            workspaceId.toString(),
        );

    const skip = (page - 1) * limit;

    const [result] = await WorkspaceMember.aggregate([
        {
            $match: {
                workspace: workspaceObjectId,
                status: {
                    $in: [
                        WORKSPACE_MEMBER_STATUS.ACTIVE,
                        WORKSPACE_MEMBER_STATUS.SUSPENDED,
                    ],
                },
            },
        },
        {
            $lookup: {
                from: User.collection.name,
                localField: 'user',
                foreignField: '_id',
                pipeline: [
                    {
                        $match: {
                            status: {
                                $ne: USER_STATUS.CLOSED,
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            firstName: 1,
                            lastName: 1,
                            status: 1,
                        },
                    },
                ],
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        {
            $lookup: {
                from: Role.collection.name,
                localField: 'role',
                foreignField: '_id',
                pipeline: [
                    {
                        $match: {
                            workspace: workspaceObjectId,
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            key: 1,
                            name: 1,
                        },
                    },
                ],
                as: 'role',
            },
        },
        {
            $unwind: '$role',
        },
        {
            $facet: {
                members: [
                    {
                        $sort: {
                            joinedAt: 1,
                            _id: 1,
                        },
                    },
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                    {
                        $project: {
                            _id: 0,
                            id: {
                                $toString: '$_id',
                            },
                            status: 1,
                            joinedAt: 1,
                            user: {
                                id: {
                                    $toString: '$user._id',
                                },
                                firstName: '$user.firstName',
                                lastName: '$user.lastName',
                                accountStatus: '$user.status',
                            },
                            role: {
                                id: {
                                    $toString: '$role._id',
                                },
                                key: '$role.key',
                                name: '$role.name',
                            },
                        },
                    },
                ],
                metadata: [
                    {
                        $count: 'total',
                    },
                ],
            },
        },
    ]).exec();

    const members = result?.members ?? [];
    const total = result?.metadata?.[0]?.total ?? 0;

    return {
        members,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
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
    listWorkspaceMembers,
    updateWorkspace,
};