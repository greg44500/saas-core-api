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
    validatePlanCapabilities,
} from '../../../plan/plan.service.js';


const updatePlatformPlan = async ({
    planId,
    planData,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!planId || !planData || !actorId) {
        throw new TypeError(
            'planId, planData and actorId are required '
            + 'to update a platform plan',
        );
    }

    if (planData.status === PLAN_STATUS.ARCHIVED) {
        throw new AppError(
            'Un plan doit être archivé via l’action dédiée',
            409,
        );
    }

    validatePlanCapabilities(planData);

    let updatedPlan;

    await mongoose.connection.transaction(async (session) => {
        updatedPlan = await Plan.findOneAndUpdate(
            {
                _id: planId,
                status: {
                    $ne: PLAN_STATUS.ARCHIVED,
                },
            },
            {
                $set: {
                    ...planData,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!updatedPlan) {
            const existingPlan = await Plan.findById(planId)
                .session(session);

            if (!existingPlan) {
                throw new AppError(
                    'Plan introuvable',
                    404,
                );
            }

            throw new AppError(
                'Un plan archivé ne peut plus être modifié',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLAN_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.PLAN,
                entityId: updatedPlan._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    updatedFields: Object.keys(planData),
                },
            },
            { session },
        );
    });

    return {
        id: updatedPlan._id.toString(),
        key: updatedPlan.key,
        name: updatedPlan.name,
        description: updatedPlan.description ?? null,
        status: updatedPlan.status,
        isPublic: updatedPlan.isPublic,
        displayOrder: updatedPlan.displayOrder,
        trialEnabled: updatedPlan.trialEnabled,
        trialDurationDays: updatedPlan.trialDurationDays ?? null,
        currency: updatedPlan.currency,
        priceMonthlyExclTaxMinor:
            updatedPlan.priceMonthlyExclTaxMinor,
        priceYearlyExclTaxMinor:
            updatedPlan.priceYearlyExclTaxMinor,
        features: updatedPlan.features,
        limits: updatedPlan.limits instanceof Map
            ? Object.fromEntries(updatedPlan.limits)
            : updatedPlan.limits ?? {},
        createdAt: updatedPlan.createdAt,
        updatedAt: updatedPlan.updatedAt,
    };
};


export {
    updatePlatformPlan,
};
