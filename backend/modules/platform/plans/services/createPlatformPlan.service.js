import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';
import {
    createAuditLog,
} from '../../../auditLog/auditLog.service.js';
import {
    createPlan,
} from '../../../plan/plan.service.js';

const createPlatformPlan = async ({
    planData,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!planData || !actorId) {
        throw new TypeError(
            'planData and actorId are required to create a platform plan',
        );
    }

    let createdPlan;

    await mongoose.connection.transaction(async (session) => {
        createdPlan = await createPlan({
            planData,
            actorId,
            session,
        });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLAN_CREATED,
                entityType: AUDIT_ENTITY_TYPE.PLAN,
                entityId: createdPlan._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    name: createdPlan.name,
                    status: createdPlan.status,
                    isPublic: createdPlan.isPublic,
                },
            },
            { session },
        );
    });

    return {
        id: createdPlan._id.toString(),
        isBaseline: false,
        name: createdPlan.name,
        description: createdPlan.description ?? null,
        status: createdPlan.status,
        isPublic: createdPlan.isPublic,
        displayOrder: createdPlan.displayOrder,
        trialEnabled: createdPlan.trialEnabled,
        trialDurationDays: createdPlan.trialDurationDays ?? null,
        currency: createdPlan.currency,
        priceMonthlyExclTaxMinor:
            createdPlan.priceMonthlyExclTaxMinor,
        priceYearlyExclTaxMinor:
            createdPlan.priceYearlyExclTaxMinor,
        features: createdPlan.features,
        limits: createdPlan.limits instanceof Map
            ? Object.fromEntries(createdPlan.limits)
            : createdPlan.limits ?? {},
        createdAt: createdPlan.createdAt,
        updatedAt: createdPlan.updatedAt,
    };
};

export {
    createPlatformPlan,
};
