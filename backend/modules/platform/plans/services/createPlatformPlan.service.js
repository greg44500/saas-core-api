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


/**
 * Crée un plan depuis le périmètre d'administration Platform.
 *
 * La création du plan et son AuditLog participent à la même transaction :
 * un plan ne doit pas être persisté sans sa trace d'administration associée.
 *
 * La validation structurelle du payload est assurée en amont par Zod.
 * La validation fonctionnelle des features et métriques reste déléguée
 * à `createPlan()`, qui utilise le registre de capabilities du socle.
 *
 * @param {object} params
 * @param {object} params.planData
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
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

                /**
                 * L'audit conserve uniquement les informations utiles pour
                 * comprendre la création sans recopier tout le document Plan.
                 *
                 * Les prix, features et limites restent consultables sur
                 * l'entité elle-même et pourront évoluer ultérieurement.
                 */
                metadata: {
                    key: createdPlan.key,
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
        key: createdPlan.key,
        name: createdPlan.name,
        description: createdPlan.description ?? null,
        status: createdPlan.status,
        isPublic: createdPlan.isPublic,
        displayOrder: createdPlan.displayOrder,
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