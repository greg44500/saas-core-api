import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { Role } from '../../modules/role/role.model.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    createTrialIdentityFingerprint,
} from '../../modules/trialEligibility/trialEligibility.service.js';
import {
    TrialEligibility,
} from '../../modules/trialEligibility/trialEligibility.model.js';
import { User } from '../../modules/users/user.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';

const RESETTABLE_COMMERCIAL_STATUSES = new Set([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.CANCELED,
    SUBSCRIPTION_STATUS.EXPIRED,
]);

/**
 * Empêche qu'un outil destiné aux données locales puisse devenir un raccourci
 * métier en production. Trois barrières indépendantes sont exigées :
 * environnement development, activation explicite dans la configuration et
 * confirmation volontaire à chaque exécution du runner.
 */
const assertDevelopmentTrialResetAllowed = ({
    nodeEnv = env.NODE_ENV,
    resetEnabled = env.ALLOW_DEVELOPMENT_DATA_RESET,
    confirmed = false,
} = {}) => {
    if (nodeEnv !== 'development') {
        throw new Error(
            'La réinitialisation de trial est autorisée uniquement avec NODE_ENV=development.',
        );
    }

    if (resetEnabled !== true) {
        throw new Error(
            'La réinitialisation de données de développement est désactivée. Activez ALLOW_DEVELOPMENT_DATA_RESET=true pour cette opération.',
        );
    }

    if (confirmed !== true) {
        throw new Error(
            'La réinitialisation exige --confirm-development-reset.',
        );
    }
};

/**
 * Réinitialise un scénario de trial pour un propriétaire et un workspace de
 * développement sans modifier les règles utilisées par l'API réelle.
 *
 * La baseline Free et les AuditLogs sont conservés. Une Subscription
 * commerciale active ou past_due est volontairement refusée : même en
 * développement, l'outil ne doit pas effacer silencieusement un scénario de
 * paiement qu'un développeur cherche peut-être à diagnostiquer.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.workspaceId
 * @param {boolean} params.confirmed
 * @param {string} [params.nodeEnv]
 * @param {boolean} [params.resetEnabled]
 * @returns {Promise<{userId: string, workspaceId: string, removedCommercialSubscription: boolean, removedTrialEligibility: boolean}>}
 */
const resetDevelopmentTrial = async ({
    email,
    workspaceId,
    confirmed,
    nodeEnv = env.NODE_ENV,
    resetEnabled = env.ALLOW_DEVELOPMENT_DATA_RESET,
}) => {
    assertDevelopmentTrialResetAllowed({
        nodeEnv,
        resetEnabled,
        confirmed,
    });

    if (!email) {
        throw new TypeError('email is required');
    }

    if (!mongoose.isObjectIdOrHexString(workspaceId)) {
        throw new TypeError('workspaceId must be a valid ObjectId');
    }

    const emailCanonical = canonicalizeEmail(email);
    const identityFingerprint =
        createTrialIdentityFingerprint(emailCanonical);

    let result;

    await mongoose.connection.transaction(async (session) => {
        const user = await User.findOne({
            emailCanonical,
        }).session(session);

        if (!user) {
            throw new Error('Aucun utilisateur ne correspond à cette identité.');
        }

        const ownerRole = await Role.findOne({
            workspace: workspaceId,
            key: 'owner',
            deletedAt: null,
        }).session(session);

        if (!ownerRole) {
            throw new Error('Le rôle owner du workspace est introuvable.');
        }

        const ownerMembership = await WorkspaceMember.exists({
            workspace: workspaceId,
            user: user._id,
            role: ownerRole._id,
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        }).session(session);

        if (!ownerMembership) {
            throw new Error(
                'Cette identité n’est pas le propriétaire actif du workspace ciblé.',
            );
        }

        const commercialSubscription = await Subscription.findOne({
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
        }).session(session);

        if (
            commercialSubscription
            && !RESETTABLE_COMMERCIAL_STATUSES.has(
                commercialSubscription.status,
            )
        ) {
            throw new Error(
                `La Subscription commerciale ${commercialSubscription.status} ne peut pas être supprimée par le reset de trial.`,
            );
        }

        const subscriptionDeletion = commercialSubscription
            ? await Subscription.deleteOne({
                _id: commercialSubscription._id,
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
            }).session(session)
            : { deletedCount: 0 };

        const eligibilityDeletion = await TrialEligibility.deleteOne({
            identityFingerprint,
        }).session(session);

        result = {
            userId: user._id.toString(),
            workspaceId: workspaceId.toString(),
            removedCommercialSubscription:
                subscriptionDeletion.deletedCount === 1,
            removedTrialEligibility:
                eligibilityDeletion.deletedCount === 1,
        };
    });

    return result;
};

export {
    RESETTABLE_COMMERCIAL_STATUSES,
    assertDevelopmentTrialResetAllowed,
    resetDevelopmentTrial,
};
