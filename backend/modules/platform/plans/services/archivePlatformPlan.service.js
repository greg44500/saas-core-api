import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';
import {
    PLAN_STATUS,
} from '../../../../constants/plan.constants.js';
import {
    AppError,
} from '../../../../utils/appError.js';
import {
    createAuditLog,
} from '../../../auditLog/auditLog.service.js';
import {
    Plan,
} from '../../../plan/plan.model.js';
import {
    isBaselinePlan,
} from '../../../plan/plan.service.js';

const archivePlatformPlan = async ({
    planId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!planId || !actorId) {
        throw new TypeError(
            'planId and actorId are required to archive a platform plan',
        );
    }

    let archivedPlan;

    await mongoose.connection.transaction(async (session) => {
        const currentPlan = await Plan.findById(planId).session(session);

        if (!currentPlan) {
            throw new AppError('Plan introuvable', 404);
        }

        if (isBaselinePlan(currentPlan)) {
            throw new AppError(
                'Le plan baseline ne peut pas être archivé',
                409,
            );
        }

        if (currentPlan.status === PLAN_STATUS.ARCHIVED) {
            throw new AppError('Ce plan est déjà archivé', 409);
        }

        archivedPlan = await Plan.findOneAndUpdate(
            {
                _id: planId,
                status: {
                    $ne: PLAN_STATUS.ARCHIVED,
                },
            },
            {
                $set: {
                    status: PLAN_STATUS.ARCHIVED,
                    isPublic: false,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!archivedPlan) {
            throw new AppError(
                'Le plan a été modifié avant son archivage',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLAN_ARCHIVED,
                entityType: AUDIT_ENTITY_TYPE.PLAN,
                entityId: archivedPlan._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    archived: true,
                },
            },
            { session },
        );
    });

    return {
        id: archivedPlan._id.toString(),
        isBaseline: false,
        status: archivedPlan.status,
        isPublic: archivedPlan.isPublic,
        updatedAt: archivedPlan.updatedAt,
    };
};

export {
    archivePlatformPlan,
};
