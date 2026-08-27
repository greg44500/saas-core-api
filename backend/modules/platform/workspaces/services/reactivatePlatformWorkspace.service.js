import mongoose from 'mongoose';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../../constants/auditActions.constants.js';
import { WORKSPACE_STATUS } from '../../../../constants/workspace.constants.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import { Workspace } from '../../../workspace/workspace.model.js';
import { AppError } from '../../../../utils/appError.js';

const reactivatePlatformWorkspace = async ({
    workspaceId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !actorId) {
        throw new TypeError(
            'workspaceId and actorId are required '
            + 'to reactivate a platform workspace',
        );
    }

    const now = new Date();
    let reactivatedWorkspace;

    await mongoose.connection.transaction(async (session) => {
        reactivatedWorkspace = await Workspace.findOneAndUpdate(
            { _id: workspaceId, status: WORKSPACE_STATUS.SUSPENDED },
            {
                $set: {
                    status: WORKSPACE_STATUS.ACTIVE,
                    statusReason: null,
                    statusReasonDetails: null,
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

        if (!reactivatedWorkspace) {
            const existingWorkspace = await Workspace.findById(workspaceId)
                .session(session);

            if (!existingWorkspace) {
                throw new AppError('Workspace introuvable', 404);
            }

            throw new AppError(
                'Ce workspace ne peut pas être réactivé dans son état actuel',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: reactivatedWorkspace._id,
                action: AUDIT_ACTION.WORKSPACE_REACTIVATED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: reactivatedWorkspace._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
            },
            { session },
        );
    });

    return {
        id: reactivatedWorkspace._id.toString(),
        status: reactivatedWorkspace.status,
        statusReason: reactivatedWorkspace.statusReason ?? null,
        statusReasonDetails: reactivatedWorkspace.statusReasonDetails ?? null,
        statusChangedAt: reactivatedWorkspace.statusChangedAt,
    };
};

export { reactivatePlatformWorkspace };
