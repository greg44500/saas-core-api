import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    COMMERCIAL_INVITATION_STATUS,
} from '../../constants/commercialInvitation.constants.js';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_TERM_TYPE,
} from '../../constants/subscription.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { Plan } from '../plan/plan.model.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import {
    hasConsumedTrial,
    recordTrialConsumption,
} from '../trialEligibility/trialEligibility.service.js';
import { User } from '../users/user.model.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import {
    createWorkspaceInSession,
} from '../workspace/workspace.service.js';
import { CommercialInvitation } from './commercialInvitation.model.js';
import {
    assertCommercialInvitationOfferIsCurrent,
    hashCommercialInvitationToken,
} from './commercialInvitation.service.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Crée la Subscription commerciale correspondant exactement à la proposition
 * déjà vérifiée. Cette primitive n'ouvre pas de transaction : elle participe à
 * celle de l'acceptation afin qu'aucun workspace ou trial partiel ne survive.
 *
 * L'éligibilité au trial a déjà été lue avant le provisioning. L'écriture
 * `recordTrialConsumption` reste toutefois dans cette primitive et son index
 * unique constitue le garde final contre deux acceptations concurrentes.
 */
const createAcceptedCommercialSubscription = async ({
    invitation,
    plan,
    user,
    workspace,
    session,
    now,
    ipAddress = null,
    userAgent = null,
}) => {
    const snapshot = invitation.offerSnapshot;
    let subscription;

    if (snapshot.trialEnabled === true) {
        if (
            !Number.isInteger(snapshot.trialDurationDays)
            || snapshot.trialDurationDays <= 0
        ) {
            throw new AppError(
                'La durée du trial commercial est invalide',
                409,
            );
        }

        const trialEndsAt = new Date(
            now.getTime() + snapshot.trialDurationDays * DAY_IN_MS,
        );

        [subscription] = await Subscription.create(
            [
                {
                    workspace: workspace._id,
                    plan: plan._id,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    termType: SUBSCRIPTION_TERM_TYPE.FIXED,
                    status: SUBSCRIPTION_STATUS.TRIALING,
                    currentPeriodStart: now,
                    currentPeriodEnd: trialEndsAt,
                    trialEndsAt,
                    cancelAtPeriodEnd: false,
                    billingInterval: snapshot.billingInterval,
                    currency: snapshot.currency,
                    priceExclTaxMinor: snapshot.priceExclTaxMinor,
                    provider: BILLING_PROVIDER.MANUAL,
                    createdBy: user._id,
                    updatedBy: user._id,
                },
            ],
            { session },
        );

        await recordTrialConsumption({
            emailCanonical: user.emailCanonical,
            userId: user._id,
            workspaceId: workspace._id,
            subscriptionId: subscription._id,
            session,
        });
    } else {
        if (
            snapshot.billingInterval !== BILLING_INTERVAL.NONE
            || snapshot.priceExclTaxMinor !== 0
        ) {
            throw new AppError(
                'La configuration de l’offre gratuite durable est invalide',
                409,
            );
        }

        [subscription] = await Subscription.create(
            [
                {
                    workspace: workspace._id,
                    plan: plan._id,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    currentPeriodStart: now,
                    currentPeriodEnd: null,
                    trialEndsAt: null,
                    cancelAtPeriodEnd: false,
                    billingInterval: BILLING_INTERVAL.NONE,
                    currency: snapshot.currency,
                    priceExclTaxMinor: 0,
                    provider: BILLING_PROVIDER.MANUAL,
                    createdBy: user._id,
                    updatedBy: user._id,
                },
            ],
            { session },
        );
    }

    await createAuditLog(
        {
            actor: user._id,
            workspace: workspace._id,
            action: AUDIT_ACTION.SUBSCRIPTION_CREATED,
            entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
            entityId: subscription._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                reason: 'commercial_invitation_accepted',
                commercialInvitationId: invitation._id.toString(),
                planId: plan._id.toString(),
                beneficiaryUserId: user._id.toString(),
                termType: subscription.termType,
                trialEndsAt: subscription.trialEndsAt ?? null,
            },
        },
        { session },
    );

    return subscription;
};

/**
 * Accepte une proposition commerciale pour le premier workspace d'un User.
 *
 * L'utilisateur doit avoir suivi Auth normalement avant cette opération. Le
 * token prouve seulement qu'une proposition existe ; l'identité authentifiée
 * reste l'autorité et son email doit correspondre à l'invitation.
 *
 * Toutes les écritures sont atomiques : provisioning du tenant, baseline,
 * Subscription commerciale, TrialEligibility éventuel, acceptation et audits.
 */
const acceptCommercialInvitation = async ({
    token,
    userId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!token || !userId) {
        throw new TypeError(
            'token and userId are required to accept a commercial invitation',
        );
    }

    const tokenHash = hashCommercialInvitationToken(token);

    return mongoose.connection.transaction(async (session) => {
        const user = await User.findById(userId)
            .select('_id emailCanonical')
            .session(session);

        if (!user?.emailCanonical) {
            throw new AppError('Utilisateur introuvable', 401);
        }

        const invitation = await CommercialInvitation.findOne({
            tokenHash,
            status: COMMERCIAL_INVITATION_STATUS.PENDING,
            expiresAt: mongoose.trusted({ $gt: now }),
        }).session(session);

        if (!invitation) {
            throw new AppError(
                'Invitation commerciale invalide ou expirée',
                404,
            );
        }

        if (user.emailCanonical !== invitation.emailCanonical) {
            throw new AppError(
                'Cette invitation commerciale ne correspond pas au compte authentifié',
                403,
            );
        }

        const existingMembership = await WorkspaceMember.exists({
            user: user._id,
            status: mongoose.trusted({
                $in: [
                    WORKSPACE_MEMBER_STATUS.ACTIVE,
                    WORKSPACE_MEMBER_STATUS.SUSPENDED,
                ],
            }),
        }).session(session);

        if (existingMembership) {
            throw new AppError(
                'Cette invitation commerciale est réservée à la création du premier workspace',
                409,
            );
        }

        const plan = await Plan.findById(invitation.plan).session(session);

        if (!plan) {
            throw new AppError(
                'Le plan associé à l’invitation est introuvable',
                409,
            );
        }

        assertCommercialInvitationOfferIsCurrent({
            invitation,
            plan,
        });

        /*
         * Un trial déjà consommé doit être refusé avant d'engager le
         * provisioning du tenant. L'index unique de TrialEligibility reste le
         * dernier garde concurrentiel au moment de l'écriture effective.
         */
        if (invitation.offerSnapshot.trialEnabled === true) {
            const consumed = await hasConsumedTrial({
                emailCanonical: user.emailCanonical,
                session,
            });

            if (consumed) {
                throw new AppError(
                    'Cette identité a déjà consommé son trial',
                    409,
                );
            }
        }

        const workspace = await createWorkspaceInSession({
            name: invitation.workspaceName,
            actorId: user._id,
            session,
            ipAddress,
            userAgent,
        });

        const subscription = await createAcceptedCommercialSubscription({
            invitation,
            plan,
            user,
            workspace,
            session,
            now,
            ipAddress,
            userAgent,
        });

        const acceptedInvitation = await CommercialInvitation.findOneAndUpdate(
            {
                _id: invitation._id,
                tokenHash,
                status: COMMERCIAL_INVITATION_STATUS.PENDING,
                expiresAt: mongoose.trusted({ $gt: now }),
            },
            {
                $set: {
                    status: COMMERCIAL_INVITATION_STATUS.ACCEPTED,
                    acceptedAt: now,
                    acceptedBy: user._id,
                    workspace: workspace._id,
                    subscription: subscription._id,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!acceptedInvitation) {
            throw new AppError(
                'L’invitation commerciale a été modifiée concurremment',
                409,
            );
        }

        await createAuditLog(
            {
                actor: user._id,
                workspace: workspace._id,
                action: AUDIT_ACTION.COMMERCIAL_INVITATION_ACCEPTED,
                entityType: AUDIT_ENTITY_TYPE.COMMERCIAL_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    invitedBy: invitation.invitedBy?.toString() ?? null,
                    planId: plan._id.toString(),
                    workspaceId: workspace._id.toString(),
                    subscriptionId: subscription._id.toString(),
                    beneficiaryUserId: user._id.toString(),
                },
            },
            { session },
        );

        return {
            invitation: acceptedInvitation,
            plan,
            subscription,
            workspace,
        };
    });
};

export {
    acceptCommercialInvitation,
    createAcceptedCommercialSubscription,
};
