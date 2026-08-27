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


/**
 * Archive un plan depuis l'administration Platform.
 *
 * L'archivage constitue une transition métier dédiée :
 * un plan déjà archivé ne peut pas être archivé une seconde fois.
 *
 * @param {object} params
 * @param {string} params.planId
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const archivePlatformPlan = async ({
    planId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!planId || !actorId) {
        throw new TypeError(
            'planId and actorId are required '
            + 'to archive a platform plan',
        );
    }

    let archivedPlan;

    await mongoose.connection.transaction(async (session) => {
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
            const existingPlan = await Plan.findById(planId)
                .session(session);

            if (!existingPlan) {
                throw new AppError(
                    'Plan introuvable',
                    404,
                );
            }

            throw new AppError(
                'Ce plan est déjà archivé',
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
        key: archivedPlan.key,
        status: archivedPlan.status,
        isPublic: archivedPlan.isPublic,
        updatedAt: archivedPlan.updatedAt,
    };
};


export {
    archivePlatformPlan,
};