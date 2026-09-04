import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';

import {
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    AppError,
} from '../../../utils/appError.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import {
    Plan,
} from '../../plan/plan.model.js';

import {
    isBaselinePlan,
} from '../../plan/plan.service.js';

import {
    hasConsumedTrial,
    recordTrialConsumption,
} from '../../trialEligibility/trialEligibility.service.js';

import {
    Subscription,
} from '../subscription.model.js';

import {
    buildTrialSubscriptionDto,
    resolveCurrentWorkspaceOwner,
    resolveTrialPrice,
} from './grantTrial.helpers.js';


const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;


/**
 * Accorde un trial commercial à un workspace ou change le plan d'un trial
 * déjà en cours.
 *
 * Invariants métier protégés :
 * - aucun trial sur le plan baseline ;
 * - le plan doit être actif et explicitement éligible au trial ;
 * - une identité ne consomme qu'un seul premier trial ;
 * - la baseline reste active en parallèle ;
 * - un changement de plan pendant le trial ne modifie jamais trialEndsAt ;
 * - une souscription commerciale active/past_due bloque un nouveau trial ;
 * - création de la Subscription et consommation de TrialEligibility sont
 *   atomiques dans la même transaction MongoDB.
 */
const grantTrial = async ({
    workspaceId,
    planId,
    billingInterval,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !workspaceId
        || !planId
        || !billingInterval
        || !actorId
    ) {
        throw new TypeError(
            'workspaceId, planId, billingInterval and actorId are required to grant a trial',
        );
    }

    let resultSubscription;

    await mongoose.connection.transaction(async (session) => {
        const plan = await Plan.findOne({
            _id: planId,
            status: PLAN_STATUS.ACTIVE,
        }).session(session);

        if (!plan) {
            throw new AppError(
                'Le plan sélectionné est introuvable ou indisponible',
                404,
            );
        }

        if (isBaselinePlan(plan)) {
            throw new AppError(
                'Le plan de référence ne peut pas bénéficier d’un trial',
                409,
            );
        }

        if (
            plan.trialEnabled !== true
            || !Number.isInteger(plan.trialDurationDays)
            || plan.trialDurationDays <= 0
        ) {
            throw new AppError(
                'Le plan sélectionné ne propose pas de trial',
                409,
            );
        }

        const priceExclTaxMinor = resolveTrialPrice(
            plan,
            billingInterval,
        );

        const existingTrial = await Subscription.findOne({
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
        }).session(session);

        /*
         * Un changement de plan pendant un trial réutilise la même
         * Subscription commerciale. L'horloge du trial reste donc intacte.
         */
        if (existingTrial) {
            if (
                !existingTrial.trialEndsAt
                || existingTrial.trialEndsAt <= new Date()
            ) {
                throw new AppError(
                    'Le trial commercial existant est déjà arrivé à expiration',
                    409,
                );
            }

            const previousPlanId =
                existingTrial.plan?.toString() ?? null;

            resultSubscription =
                await Subscription.findByIdAndUpdate(
                    existingTrial._id,
                    {
                        $set: {
                            plan: plan._id,
                            billingInterval,
                            currency: plan.currency,
                            priceExclTaxMinor,
                            updatedBy: actorId,
                        },
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

            await createAuditLog(
                {
                    actor: actorId,
                    action:
                        AUDIT_ACTION.SUBSCRIPTION_UPDATED,
                    entityType:
                        AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                    entityId:
                        resultSubscription._id,
                    status:
                        AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        reason: 'trial_plan_changed',
                        previousPlanId,
                        newPlanId:
                            plan._id.toString(),
                        trialEndsAt:
                            existingTrial.trialEndsAt,
                        trialClockPreserved: true,
                    },
                },
                { session },
            );

            return;
        }

        const conflictingCommercialSubscription =
            await Subscription.findOne({
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: mongoose.trusted({
                    $in: [
                        SUBSCRIPTION_STATUS.ACTIVE,
                        SUBSCRIPTION_STATUS.PAST_DUE,
                    ],
                }),
            }).session(session);

        if (conflictingCommercialSubscription) {
            throw new AppError(
                'Une souscription commerciale courante existe déjà pour ce workspace',
                409,
            );
        }

        const owner = await resolveCurrentWorkspaceOwner({
            workspaceId,
            session,
        });

        const consumed = await hasConsumedTrial({
            emailCanonical: owner.emailCanonical,
            session,
        });

        if (consumed) {
            throw new AppError(
                'Cette identité a déjà consommé son trial',
                409,
            );
        }

        const currentPeriodStart = new Date();
        const trialEndsAt = new Date(
            currentPeriodStart.getTime()
            + plan.trialDurationDays
                * MILLISECONDS_PER_DAY,
        );

        const [createdSubscription] =
            await Subscription.create(
                [
                    {
                        workspace: workspaceId,
                        plan: plan._id,
                        kind:
                            SUBSCRIPTION_KIND.COMMERCIAL,
                        status:
                            SUBSCRIPTION_STATUS.TRIALING,
                        currentPeriodStart,
                        currentPeriodEnd: trialEndsAt,
                        trialEndsAt,
                        cancelAtPeriodEnd: false,
                        billingInterval,
                        currency: plan.currency,
                        priceExclTaxMinor,
                        provider:
                            BILLING_PROVIDER.MANUAL,
                        createdBy: actorId,
                        updatedBy: actorId,
                    },
                ],
                { session },
            );

        /*
         * La consommation d'éligibilité fait partie de la même transaction :
         * une Subscription ne doit pas survivre si ce verrou ne peut pas être
         * enregistré, et inversement.
         */
        await recordTrialConsumption({
            emailCanonical: owner.emailCanonical,
            userId: owner._id,
            workspaceId,
            subscriptionId:
                createdSubscription._id,
            session,
        });

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.SUBSCRIPTION_CREATED,
                entityType:
                    AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId:
                    createdSubscription._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: 'trial_granted',
                    planId: plan._id.toString(),
                    workspaceId:
                        workspaceId.toString(),
                    beneficiaryUserId:
                        owner._id.toString(),
                    trialEndsAt,
                },
            },
            { session },
        );

        resultSubscription = createdSubscription;
    });

    return buildTrialSubscriptionDto(
        resultSubscription,
    );
};


export {
    grantTrial,
};
