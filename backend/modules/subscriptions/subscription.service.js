import mongoose from 'mongoose';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
} from '../../constants/subscription.constants.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
} from '../../constants/plan.constants.js';
import {
    WORKSPACE_ACCESS_MODE,
    WORKSPACE_ACCESS_REASON,
} from '../../constants/workspaceAccess.constants.js';

import { Plan } from '../plan/plan.model.js';
import {
    assessWorkspacePlanCompatibility,
} from '../plan/planCompatibility.service.js';
import { Subscription } from './subscription.model.js';

import { AppError } from '../../utils/appError.js';

/**
 * Crée la souscription gratuite initiale d'un nouveau workspace.
 *
 * Cette opération participe à la transaction de création du workspace.
 * La session MongoDB est donc obligatoire : le workspace ne doit pas être
 * conservé si sa souscription initiale ne peut pas être créée.
 *
 * Le plan Free constitue la baseline durable du workspace. Un futur trial ou
 * abonnement payant est représenté par une souscription `commercial` séparée :
 * la baseline Free n'est donc ni remplacée ni supprimée lorsqu'un trial est
 * accordé.
 *
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId} params.workspaceId
 * @param {import('mongoose').Types.ObjectId} params.actorId
 * @param {import('mongoose').ClientSession} params.session
 * @returns {Promise<import('mongoose').Document>}
 */

const createFreeSubscriptionForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create a free subscription',
        );
    }

    const freePlan = await Plan.findOne({
        key: PLAN_KEY.FREE,
        status: PLAN_STATUS.ACTIVE,
    }).session(session);

    if (!freePlan) {
        throw new AppError(
            'Le plan gratuit actif est introuvable. Exécutez le seed des plans.',
            500,
        );
    }

    const currentPeriodStart = new Date();

    const [subscription] = await Subscription.create(
        [
            {
                workspace: workspaceId,
                plan: freePlan._id,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                currentPeriodStart,
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: BILLING_INTERVAL.NONE,
                currency: freePlan.currency,
                priceExclTaxMinor:
                    freePlan.priceMonthlyExclTaxMinor,
                provider: BILLING_PROVIDER.MANUAL,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ],
        {
            session,
        },
    );

    return subscription;
};

/**
 * Récupère la souscription utilisable et le plan effectif d'un workspace.
 *
 * Les bornes temporelles sont les autorités métier pour l'accès commercial :
 * un statut `trialing` ou `active` resté temporairement en base après son
 * échéance ne doit jamais prolonger les droits payants.
 */
const getWorkspacePlanEntitlement = async ({
    workspaceId,
    session,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve a workspace plan entitlement',
        );
    }

    const now = new Date();

    const buildSubscriptionQuery = (filter) => {
        let query = Subscription.findOne({
            workspace: workspaceId,
            ...filter,
        }).populate({
            path: 'plan',
        });

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    let commercialSubscription = await buildSubscriptionQuery({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodEnd: mongoose.trusted({
            $type: 'date',
            $gt: now,
        }),
    });

    if (!commercialSubscription) {
        commercialSubscription = await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            trialEndsAt: mongoose.trusted({
                $type: 'date',
                $gt: now,
            }),
        });
    }

    const subscription = commercialSubscription
        ?? await buildSubscriptionQuery({
            kind: SUBSCRIPTION_KIND.BASELINE,
            status: SUBSCRIPTION_STATUS.ACTIVE,
        });

    if (!subscription) {
        throw new AppError(
            'Aucune souscription utilisable n’est associée à ce workspace.',
            403,
        );
    }

    if (!subscription.plan) {
        throw new AppError(
            'Le plan associé à la souscription est introuvable.',
            500,
        );
    }

    return {
        subscription,
        plan: subscription.plan,
    };
};

/**
 * Résout le mode d'accès effectif d'un workspace à partir de son plan effectif
 * et de son utilisation actuelle.
 *
 * L'état n'est volontairement pas persisté : dès que les capacités bloquantes
 * redeviennent conformes, le prochain contrôle retourne automatiquement
 * `normal`, sans job ni action manuelle de déverrouillage.
 */
const getWorkspaceAccessEntitlement = async ({
    workspaceId,
    session,
    at = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve workspace access',
        );
    }

    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
        throw new TypeError('at must be a valid Date');
    }

    const planEntitlement = await getWorkspacePlanEntitlement({
        workspaceId,
        session,
    });

    const compatibility = await assessWorkspacePlanCompatibility({
        workspaceId,
        targetPlanId: planEntitlement.plan._id,
        at,
        session: session ?? null,
    });

    const accessMode = compatibility.compatible
        ? WORKSPACE_ACCESS_MODE.NORMAL
        : WORKSPACE_ACCESS_MODE.REMEDIATION;

    return {
        ...planEntitlement,
        accessMode,
        reason: accessMode === WORKSPACE_ACCESS_MODE.REMEDIATION
            ? WORKSPACE_ACCESS_REASON.PLAN_LIMITS_EXCEEDED
            : null,
        blockingLimits: compatibility.blockingLimits,
        nonBlockingLimits: compatibility.nonBlockingLimits,
    };
};

export {
    createFreeSubscriptionForWorkspace,
    getWorkspaceAccessEntitlement,
    getWorkspacePlanEntitlement,
};
