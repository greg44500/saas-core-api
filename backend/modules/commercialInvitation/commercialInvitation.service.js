import crypto from 'node:crypto';
import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    COMMERCIAL_INVITATION_DELIVERY_STATUS,
    COMMERCIAL_INVITATION_STATUS,
    COMMERCIAL_INVITATION_TOKEN_BYTES,
    COMMERCIAL_INVITATION_TTL_DAYS,
} from '../../constants/commercialInvitation.constants.js';
import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';
import {
    PLAN_STATUS,
} from '../../constants/plan.constants.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { Plan } from '../plan/plan.model.js';
import { User } from '../users/user.model.js';
import { CommercialInvitation } from './commercialInvitation.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const createCommercialInvitationToken = () =>
    crypto.randomBytes(COMMERCIAL_INVITATION_TOKEN_BYTES).toString('hex');

const hashCommercialInvitationToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const resolvePlanPrice = ({ plan, billingInterval }) => {
    if (billingInterval === BILLING_INTERVAL.MONTHLY) {
        return plan.priceMonthlyExclTaxMinor;
    }

    if (billingInterval === BILLING_INTERVAL.YEARLY) {
        return plan.priceYearlyExclTaxMinor;
    }

    if (billingInterval === BILLING_INTERVAL.NONE) {
        return 0;
    }

    throw new AppError('Périodicité commerciale invalide', 409);
};

/**
 * Une invitation commerciale D-020 cible exclusivement une offre privée
 * ordinaire. Le Plan baseline et les offres publiques ne peuvent pas être
 * détournés en mécanisme d'invitation commerciale.
 */
const assertCommercialInvitationPlan = ({ plan, billingInterval }) => {
    if (
        !plan
        || plan.status !== PLAN_STATUS.ACTIVE
        || plan.isPublic !== false
        || plan.systemRole !== null
    ) {
        throw new AppError(
            'Le plan sélectionné n’est pas disponible pour une invitation commerciale',
            409,
        );
    }

    if (plan.trialEnabled === true) {
        if (
            billingInterval !== BILLING_INTERVAL.MONTHLY
            && billingInterval !== BILLING_INTERVAL.YEARLY
        ) {
            throw new AppError(
                'Un trial commercial doit utiliser une périodicité mensuelle ou annuelle',
                409,
            );
        }
        return;
    }

    if (billingInterval !== BILLING_INTERVAL.NONE) {
        throw new AppError(
            'Une offre commerciale durable gratuite ne doit pas utiliser de périodicité',
            409,
        );
    }

    if (
        plan.priceMonthlyExclTaxMinor !== 0
        || plan.priceYearlyExclTaxMinor !== 0
    ) {
        throw new AppError(
            'Une invitation sans trial ne peut cibler qu’une offre entièrement gratuite dans D-020',
            409,
        );
    }
};

const normalizeFeatures = (features = []) =>
    [...features].sort((left, right) => left.localeCompare(right));

const normalizeLimits = (limits = {}) => {
    const entries = limits instanceof Map
        ? [...limits.entries()]
        : Object.entries(limits ?? {});

    return Object.fromEntries(
        entries.sort(([left], [right]) => left.localeCompare(right)),
    );
};

const buildOfferSnapshot = ({ plan, billingInterval }) => ({
    planName: plan.name,
    currency: plan.currency,
    billingInterval,
    priceExclTaxMinor: resolvePlanPrice({ plan, billingInterval }),
    trialEnabled: plan.trialEnabled,
    trialDurationDays: plan.trialDurationDays ?? null,
    features: normalizeFeatures(plan.features),
    limits: normalizeLimits(plan.limits),
});

const buildComparableOfferSnapshot = (snapshot) => ({
    currency: snapshot.currency,
    billingInterval: snapshot.billingInterval,
    priceExclTaxMinor: snapshot.priceExclTaxMinor,
    trialEnabled: snapshot.trialEnabled,
    trialDurationDays: snapshot.trialDurationDays ?? null,
    features: normalizeFeatures(snapshot.features),
    limits: normalizeLimits(snapshot.limits),
});

/**
 * Vérifie que les conditions contractuelles d'un Plan n'ont pas changé depuis
 * l'envoi. Le nom commercial peut évoluer sans modifier les droits proposés ;
 * prix, trial, périodicité, fonctionnalités et limites restent en revanche des
 * éléments significatifs et exigent une nouvelle invitation en cas de dérive.
 */
const assertCommercialInvitationOfferIsCurrent = ({ invitation, plan }) => {
    const billingInterval = invitation.offerSnapshot.billingInterval;

    assertCommercialInvitationPlan({ plan, billingInterval });

    const currentSnapshot = buildOfferSnapshot({
        plan,
        billingInterval,
    });

    const invitationContract = JSON.stringify(
        buildComparableOfferSnapshot(invitation.offerSnapshot),
    );
    const currentContract = JSON.stringify(
        buildComparableOfferSnapshot(currentSnapshot),
    );

    if (invitationContract !== currentContract) {
        throw new AppError(
            'L’offre commerciale a été modifiée depuis l’envoi de cette invitation. Créez une nouvelle invitation.',
            409,
        );
    }

    return currentSnapshot;
};

const expirePendingCommercialInvitations = async ({
    emailCanonical = null,
    now = new Date(),
    session = null,
} = {}) => {
    const filter = {
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $lte: now }),
    };

    if (emailCanonical) {
        filter.emailCanonical = emailCanonical;
    }

    return CommercialInvitation.updateMany(
        filter,
        { $set: { status: COMMERCIAL_INVITATION_STATUS.EXPIRED } },
        { session },
    );
};

const createCommercialInvitation = async ({
    email,
    planId,
    workspaceName,
    billingInterval,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!email || !planId || !workspaceName || !billingInterval || !actorId) {
        throw new TypeError(
            'email, planId, workspaceName, billingInterval and actorId are required to create a commercial invitation',
        );
    }

    const emailCanonical = canonicalizeEmail(email);

    return mongoose.connection.transaction(async (session) => {
        /*
         * D-020 est un parcours d'acquisition initiale, pas un second mécanisme
         * de gestion commerciale des clients existants. Un compte déjà présent
         * doit utiliser les mécanismes Subscription/EntitlementOverride prévus.
         */
        const existingUser = await User.exists({
            emailCanonical,
        }).session(session);

        if (existingUser) {
            throw new AppError(
                'Une invitation commerciale initiale ne peut pas cibler un utilisateur déjà inscrit',
                409,
            );
        }

        const plan = await Plan.findById(planId).session(session);
        assertCommercialInvitationPlan({ plan, billingInterval });

        await expirePendingCommercialInvitations({
            emailCanonical,
            now,
            session,
        });

        const pendingInvitation = await CommercialInvitation.findOne({
            emailCanonical,
            status: COMMERCIAL_INVITATION_STATUS.PENDING,
        }).session(session);

        if (pendingInvitation) {
            throw new AppError(
                'Une invitation commerciale active existe déjà pour cette adresse',
                409,
            );
        }

        const token = createCommercialInvitationToken();
        const expiresAt = new Date(
            now.getTime() + COMMERCIAL_INVITATION_TTL_DAYS * DAY_IN_MS,
        );
        const offerSnapshot = buildOfferSnapshot({ plan, billingInterval });

        const [invitation] = await CommercialInvitation.create(
            [
                {
                    emailCanonical,
                    plan: plan._id,
                    workspaceName,
                    tokenHash: hashCommercialInvitationToken(token),
                    invitedBy: actorId,
                    expiresAt,
                    offerSnapshot,
                },
            ],
            { session },
        );

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.COMMERCIAL_INVITATION_CREATED,
                entityType: AUDIT_ENTITY_TYPE.COMMERCIAL_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    beneficiaryEmailCanonical: emailCanonical,
                    planId: plan._id.toString(),
                    workspaceName,
                    billingInterval,
                    trialEnabled: offerSnapshot.trialEnabled,
                    expiresAt,
                },
            },
            { session },
        );

        return { invitation, plan, token };
    });
};

const listCommercialInvitations = async ({ page = 1, limit = 20 }) => {
    await expirePendingCommercialInvitations();

    const skip = (page - 1) * limit;
    const filter = {};

    const [invitations, total] = await Promise.all([
        CommercialInvitation.find(filter)
            .select('-tokenHash')
            .populate({ path: 'plan', select: 'name status isPublic' })
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit),
        CommercialInvitation.countDocuments(filter),
    ]);

    return {
        invitations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const resendCommercialInvitation = async ({
    invitationId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => mongoose.connection.transaction(async (session) => {
    const invitation = await CommercialInvitation.findOne({
        _id: invitationId,
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    }).session(session);

    if (!invitation) {
        throw new AppError('Invitation commerciale introuvable ou inactive', 404);
    }

    const plan = await Plan.findById(invitation.plan).session(session);
    if (!plan) {
        throw new AppError('Le plan associé à l’invitation est introuvable', 409);
    }

    assertCommercialInvitationOfferIsCurrent({ invitation, plan });

    const token = createCommercialInvitationToken();
    const expiresAt = new Date(
        now.getTime() + COMMERCIAL_INVITATION_TTL_DAYS * DAY_IN_MS,
    );

    const updatedInvitation = await CommercialInvitation.findOneAndUpdate(
        {
            _id: invitation._id,
            status: COMMERCIAL_INVITATION_STATUS.PENDING,
            tokenHash: invitation.tokenHash,
        },
        {
            $set: {
                tokenHash: hashCommercialInvitationToken(token),
                expiresAt,
                deliveryStatus: COMMERCIAL_INVITATION_DELIVERY_STATUS.PENDING,
                lastDeliveryAttemptAt: null,
                deliveredAt: null,
            },
        },
        { returnDocument: 'after', runValidators: true, session },
    );

    if (!updatedInvitation) {
        throw new AppError('Invitation commerciale modifiée concurremment', 409);
    }

    await createAuditLog(
        {
            actor: actorId,
            action: AUDIT_ACTION.COMMERCIAL_INVITATION_RESENT,
            entityType: AUDIT_ENTITY_TYPE.COMMERCIAL_INVITATION,
            entityId: invitation._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: { expiresAt },
        },
        { session },
    );

    return { invitation: updatedInvitation, plan, token };
});

const revokeCommercialInvitation = async ({
    invitationId,
    reason,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => mongoose.connection.transaction(async (session) => {
    const invitation = await CommercialInvitation.findOneAndUpdate(
        {
            _id: invitationId,
            status: COMMERCIAL_INVITATION_STATUS.PENDING,
            expiresAt: mongoose.trusted({ $gt: now }),
        },
        {
            $set: {
                status: COMMERCIAL_INVITATION_STATUS.REVOKED,
                revokedAt: now,
                revokedBy: actorId,
                revokeReason: reason,
            },
        },
        { returnDocument: 'after', runValidators: true, session },
    );

    if (!invitation) {
        throw new AppError('Invitation commerciale introuvable ou inactive', 404);
    }

    await createAuditLog(
        {
            actor: actorId,
            action: AUDIT_ACTION.COMMERCIAL_INVITATION_REVOKED,
            entityType: AUDIT_ENTITY_TYPE.COMMERCIAL_INVITATION,
            entityId: invitation._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: { reason },
        },
        { session },
    );

    return invitation;
});

const previewCommercialInvitation = async ({ token, now = new Date() }) => {
    const tokenHash = hashCommercialInvitationToken(token);

    const invitation = await CommercialInvitation.findOne({
        tokenHash,
        status: COMMERCIAL_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    }).select('emailCanonical workspaceName expiresAt offerSnapshot plan');

    if (!invitation) {
        throw new AppError('Invitation commerciale invalide ou expirée', 404);
    }

    const plan = await Plan.findById(invitation.plan);

    if (!plan) {
        throw new AppError('Le plan associé à l’invitation est introuvable', 409);
    }

    assertCommercialInvitationOfferIsCurrent({ invitation, plan });

    return invitation;
};

export {
    assertCommercialInvitationOfferIsCurrent,
    assertCommercialInvitationPlan,
    buildOfferSnapshot,
    createCommercialInvitation,
    createCommercialInvitationToken,
    expirePendingCommercialInvitations,
    hashCommercialInvitationToken,
    listCommercialInvitations,
    previewCommercialInvitation,
    resendCommercialInvitation,
    revokeCommercialInvitation,
};
