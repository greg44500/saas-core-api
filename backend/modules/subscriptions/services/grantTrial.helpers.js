import {
    SYSTEM_ROLE_KEY,
} from '../../../constants/role.constants.js';

import {
    BILLING_INTERVAL,
} from '../../../constants/subscription.constants.js';

import {
    WORKSPACE_MEMBER_STATUS,
} from '../../../constants/workspaceMember.constants.js';

import {
    AppError,
} from '../../../utils/appError.js';

import {
    Role,
} from '../../role/role.model.js';

import {
    User,
} from '../../users/user.model.js';

import {
    WorkspaceMember,
} from '../../workspaceMember/workspaceMember.model.js';


/**
 * Résout le tarif à figer dans la souscription commerciale.
 *
 * Un trial n'exige pas de moyen de paiement, mais la souscription conserve
 * l'offre et la périodicité choisies pour figer son contexte commercial.
 */
const resolveTrialPrice = (plan, billingInterval) => {
    if (billingInterval === BILLING_INTERVAL.MONTHLY) {
        return plan.priceMonthlyExclTaxMinor;
    }

    if (billingInterval === BILLING_INTERVAL.YEARLY) {
        return plan.priceYearlyExclTaxMinor;
    }

    throw new AppError(
        'Un trial sur un plan payant doit utiliser une périodicité mensuelle ou annuelle',
        409,
    );
};


/**
 * Retrouve l'identité commerciale portée par l'owner actuel du workspace.
 *
 * Le créateur historique du workspace ne peut pas servir de référence : un
 * transfert d'ownership doit faire hériter le nouvel owner du reliquat du
 * trial en cours sans recréer ni réinitialiser cet essai.
 */
const resolveCurrentWorkspaceOwner = async ({
    workspaceId,
    session,
}) => {
    const ownerRole = await Role.findOne({
        workspace: workspaceId,
        key: SYSTEM_ROLE_KEY.OWNER,
    }).session(session);

    if (!ownerRole) {
        throw new AppError(
            'Le rôle owner du workspace est introuvable',
            409,
        );
    }

    const ownerMembership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        role: ownerRole._id,
        status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    }).session(session);

    if (!ownerMembership) {
        throw new AppError(
            'Aucun owner actif n’est associé à ce workspace',
            409,
        );
    }

    const owner = await User.findById(
        ownerMembership.user,
    ).session(session);

    if (!owner?.emailCanonical) {
        throw new AppError(
            'L’identité de l’owner du workspace est introuvable',
            409,
        );
    }

    return owner;
};


const buildTrialSubscriptionDto = (subscription) => ({
    id: subscription._id.toString(),
    workspace:
        subscription.workspace?.toString() ?? null,
    plan:
        subscription.plan?.toString() ?? null,
    kind: subscription.kind,
    status: subscription.status,
    currentPeriodStart:
        subscription.currentPeriodStart,
    currentPeriodEnd:
        subscription.currentPeriodEnd,
    trialEndsAt:
        subscription.trialEndsAt,
    billingInterval:
        subscription.billingInterval,
    currency: subscription.currency,
    priceExclTaxMinor:
        subscription.priceExclTaxMinor,
    provider: subscription.provider,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
});


export {
    buildTrialSubscriptionDto,
    resolveCurrentWorkspaceOwner,
    resolveTrialPrice,
};
