import mongoose from 'mongoose';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../../constants/auditActions.constants.js';
import { WORKSPACE_STATUS } from '../../../../constants/workspace.constants.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import { Workspace } from '../../../workspace/workspace.model.js';
import { AppError } from '../../../../utils/appError.js';

const suspendPlatformWorkspace = async ({
    workspaceId,
    actorId,
    statusReason,
    statusReasonDetails = null,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !actorId || !statusReason) {
        throw new TypeError(
            'workspaceId, actorId and statusReason are required '
            + 'to suspend a platform workspace',
        );
    }

    const now = new Date();
    let suspendedWorkspace;

    await mongoose.connection.transaction(async (session) => {
        suspendedWorkspace = await Workspace.findOneAndUpdate(
            { _id: workspaceId, status: WORKSPACE_STATUS.ACTIVE },
            {
                $set: {
                    status: WORKSPACE_STATUS.SUSPENDED,
                    statusReason,
                    statusReasonDetails,
                    statusChangedAt: now,
                    statusChangedBy: actorId,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!suspendedWorkspace) {
            const existingWorkspace = await Workspace.findById(workspaceId)
                .session(session);

            if (!existingWorkspace) {
                throw new AppError('Workspace introuvable', 404);
            }

            throw new AppError(
                'Ce workspace ne peut pas être suspendu dans son état actuel',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: suspendedWorkspace._id,
                action: AUDIT_ACTION.WORKSPACE_SUSPENDED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: suspendedWorkspace._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: { statusReason, statusReasonDetails },
            },
            { session },
        );
    });

    return {
        id: suspendedWorkspace._id.toString(),
        status: suspendedWorkspace.status,
        statusReason: suspendedWorkspace.statusReason,
        statusReasonDetails: suspendedWorkspace.statusReasonDetails ?? null,
        statusChangedAt: suspendedWorkspace.statusChangedAt,
    };
};

export { suspendPlatformWorkspace };
