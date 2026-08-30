import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    createAuditLog,
} from '../auditLog/auditLog.service.js';
import { Role } from '../role/role.model.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';


/**
 * Transfère atomiquement la propriété d'un workspace à un membre actif.
 *
 * L'ancien owner reçoit explicitement un rôle de remplacement fourni par
 * l'appelant. Ce choix évite de figer une politique métier implicite telle que
 * "l'ancien owner devient toujours admin".
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.workspaceId
 * @param {string|mongoose.Types.ObjectId} params.newOwnerMemberId
 * @param {string|mongoose.Types.ObjectId} params.previousOwnerRoleId
 * @param {string|mongoose.Types.ObjectId} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const transferWorkspaceOwnership = async ({
    workspaceId,
    newOwnerMemberId,
    previousOwnerRoleId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !workspaceId
        || !newOwnerMemberId
        || !previousOwnerRoleId
        || !actorId
    ) {
        throw new TypeError(
            'workspaceId, newOwnerMemberId, previousOwnerRoleId and actorId are required to transfer workspace ownership',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const [ownerRole, previousOwnerRole] = await Promise.all([
            Role.findOne({
                workspace: workspaceId,
                key: SYSTEM_ROLE_KEY.OWNER,
                isSystem: true,
            }).session(session),
            Role.findOne({
                _id: previousOwnerRoleId,
                workspace: workspaceId,
            }).session(session),
        ]);

        if (!ownerRole) {
            throw new AppError(
                'Le rôle propriétaire du workspace est introuvable',
                409,
            );
        }

        if (!previousOwnerRole) {
            throw new AppError(
                'Le rôle de remplacement de l’ancien propriétaire est introuvable',
                404,
            );
        }

        if (
            previousOwnerRole.isSystem
            && previousOwnerRole.key === SYSTEM_ROLE_KEY.OWNER
        ) {
            throw new AppError(
                'Le rôle de remplacement ne peut pas être le rôle propriétaire',
                409,
            );
        }

        const currentOwner = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: actorId,
            role: ownerRole._id,
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        }).session(session);

        if (!currentOwner) {
            throw new AppError(
                'Seul le propriétaire actuel peut transférer la propriété du workspace',
                403,
            );
        }

        const newOwner = await WorkspaceMember.findOne({
            _id: newOwnerMemberId,
            workspace: workspaceId,
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        }).session(session);

        if (!newOwner) {
            throw new AppError(
                'Le nouveau propriétaire doit être un membre actif du workspace',
                404,
            );
        }

        if (newOwner._id.toString() === currentOwner._id.toString()) {
            throw new AppError(
                'Le propriétaire actuel ne peut pas se transférer la propriété à lui-même',
                409,
            );
        }

        const ownerCountBefore = await WorkspaceMember.countDocuments({
            workspace: workspaceId,
            role: ownerRole._id,
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        }).session(session);

        if (ownerCountBefore !== 1) {
            throw new AppError(
                'Le workspace doit posséder exactement un propriétaire actif avant le transfert',
                409,
            );
        }

        const previousOwnerUserId = currentOwner.user.toString();
        const newOwnerUserId = newOwner.user.toString();

        currentOwner.role = previousOwnerRole._id;
        currentOwner.updatedBy = actorId;
        await currentOwner.save({ session });

        newOwner.role = ownerRole._id;
        newOwner.updatedBy = actorId;
        await newOwner.save({ session });

        const ownerCountAfter = await WorkspaceMember.countDocuments({
            workspace: workspaceId,
            role: ownerRole._id,
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        }).session(session);

        if (ownerCountAfter !== 1) {
            throw new AppError(
                'Le transfert doit conserver exactement un propriétaire actif',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.WORKSPACE_OWNERSHIP_TRANSFERRED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: workspaceId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    previousOwnerUserId,
                    newOwnerUserId,
                    previousOwnerMemberId:
                        currentOwner._id.toString(),
                    newOwnerMemberId:
                        newOwner._id.toString(),
                    previousOwnerRoleId:
                        previousOwnerRole._id.toString(),
                },
            },
            { session },
        );

        return {
            previousOwner: currentOwner,
            newOwner,
        };
    });
};


export { transferWorkspaceOwnership };
