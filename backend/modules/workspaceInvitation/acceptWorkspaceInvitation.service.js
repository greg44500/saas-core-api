import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    LEGAL_ACCEPTANCE_SOURCE,
} from '../../constants/legalDocuments.constants.js';
import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { hashPassword } from '../../utils/password.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import {
    createRegistrationLegalAcceptance,
} from '../legalAcceptance/legalAcceptance.service.js';
import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    assertEntitlementFeatureAvailable,
} from '../plan/planFeature.service.js';
import {
    enforcePlanLimit,
} from '../plan/planLimit.service.js';
import { Role } from '../role/role.model.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../subscriptions/subscription.service.js';
import { User } from '../users/user.model.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';
import {
    WorkspaceInvitation,
} from './workspaceInvitation.model.js';

const hashInvitationToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const loadAcceptableInvitation = async ({ tokenHash, now, session }) => {
    const invitation = await WorkspaceInvitation.findOne({
        tokenHash,
        status: WORKSPACE_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    }).session(session);

    if (!invitation) {
        throw new AppError(
            'Invitation invalide, expirée ou déjà utilisée.',
            409,
        );
    }

    return invitation;
};

const loadAcceptableRole = async ({ invitation, now, session }) => {
    const entitlement = await getWorkspaceEffectiveEntitlement({
        workspaceId: invitation.workspace,
        at: now,
        session,
    });

    assertEntitlementFeatureAvailable({
        entitlement,
        featureKey: CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
    });

    const role = await Role.findOne({
        _id: invitation.role,
        workspace: invitation.workspace,
    }).session(session);

    if (!role) {
        throw new AppError(
            'Le rôle associé à cette invitation n’existe plus.',
            409,
        );
    }

    /*
     * Même si la création d'invitation interdit déjà owner, ce contrôle
     * protège les anciennes données ou une modification manuelle de base.
     */
    if (
        role.isSystem === true
        && role.key === SYSTEM_ROLE_KEY.OWNER
    ) {
        throw new AppError(
            'Le rôle owner ne peut pas être attribué par invitation.',
            409,
        );
    }

    return role;
};

const activateWorkspaceMembership = async ({
    invitation,
    role,
    userId,
    now,
    session,
}) => {
    const existingMembership = await WorkspaceMember.findOne({
        workspace: invitation.workspace,
        user: userId,
    }).session(session);

    if (
        existingMembership
        && existingMembership.status !== WORKSPACE_MEMBER_STATUS.REMOVED
    ) {
        throw new AppError(
            'Vous appartenez déjà à ce workspace.',
            409,
        );
    }

    /*
     * Une invitation ne consomme aucune place. La capacité est réservée
     * uniquement au moment où l'appartenance devient effective.
     */
    await enforcePlanLimit({
        workspaceId: invitation.workspace,
        metricKey: CORE_PLAN_METRIC.MEMBERS,
        amount: 1,
        actorId: userId,
        at: now,
        session,
    });

    if (existingMembership) {
        existingMembership.status = WORKSPACE_MEMBER_STATUS.ACTIVE;
        existingMembership.role = role._id;
        existingMembership.updatedBy = userId;
        await existingMembership.save({ session });
        return existingMembership;
    }

    const [membership] = await WorkspaceMember.create(
        [
            {
                workspace: invitation.workspace,
                user: userId,
                role: role._id,
                status: WORKSPACE_MEMBER_STATUS.ACTIVE,
                createdBy: userId,
                updatedBy: userId,
            },
        ],
        { session },
    );

    return membership;
};

const finalizeInvitationAcceptance = async ({
    invitation,
    membership,
    role,
    userId,
    ipAddress,
    userAgent,
    now,
    session,
}) => {
    invitation.status = WORKSPACE_INVITATION_STATUS.ACCEPTED;
    invitation.acceptedBy = userId;
    invitation.acceptedAt = now;
    await invitation.save({ session });

    await createAuditLog(
        {
            actor: userId,
            workspace: invitation.workspace,
            action: AUDIT_ACTION.MEMBER_INVITATION_ACCEPTED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
            entityId: invitation._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                membershipId: membership._id.toString(),
                roleId: role._id.toString(),
            },
        },
        { session },
    );
};

/**
 * Accepte une invitation pour l'utilisateur authentifié.
 */
const acceptWorkspaceInvitation = async ({
    token,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!token || !actorId) {
        throw new TypeError(
            'token and actorId are required to accept a workspace invitation',
        );
    }

    const tokenHash = hashInvitationToken(token);

    return mongoose.connection.transaction(async (session) => {
        const actor = await User.findById(actorId)
            .select('_id emailCanonical')
            .session(session);

        if (!actor) {
            throw new AppError('Utilisateur introuvable.', 404);
        }

        const invitation = await loadAcceptableInvitation({
            tokenHash,
            now,
            session,
        });

        if (actor.emailCanonical !== invitation.emailCanonical) {
            throw new AppError(
                'Cette invitation ne correspond pas à votre compte.',
                403,
            );
        }

        const role = await loadAcceptableRole({ invitation, now, session });
        const membership = await activateWorkspaceMembership({
            invitation,
            role,
            userId: actor._id,
            now,
            session,
        });

        await finalizeInvitationAcceptance({
            invitation,
            membership,
            role,
            userId: actor._id,
            ipAddress,
            userAgent,
            now,
            session,
        });

        return {
            invitation,
            membership,
            user: actor,
        };
    });
};

/**
 * Crée le compte destinataire puis accepte la même invitation dans une seule
 * transaction. L'email reste exclusivement issu de l'invitation : le client
 * ne peut pas substituer une autre identité de connexion au moment du clic.
 */
const acceptNewWorkspaceInvitation = async ({
    token,
    firstName,
    lastName,
    password,
    legalAccepted,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (
        !token
        || !firstName
        || !lastName
        || !password
        || legalAccepted !== true
    ) {
        throw new TypeError(
            'token, firstName, lastName, password and legalAccepted=true are required to accept a new-user workspace invitation',
        );
    }

    const tokenHash = hashInvitationToken(token);

    const invitationExists = await WorkspaceInvitation.exists({
        tokenHash,
        status: WORKSPACE_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    });

    if (!invitationExists) {
        throw new AppError(
            'Invitation invalide, expirée ou déjà utilisée.',
            409,
        );
    }

    const passwordHash = await hashPassword(password);

    try {
        return await mongoose.connection.transaction(async (session) => {
            const invitation = await loadAcceptableInvitation({
                tokenHash,
                now,
                session,
            });

            const existingUser = await User.findOne({
                emailCanonical: invitation.emailCanonical,
            })
                .select('_id')
                .session(session);

            if (existingUser) {
                throw new AppError(
                    'Un compte existe déjà pour cette invitation. Connectez-vous pour l’accepter.',
                    409,
                );
            }

            const role = await loadAcceptableRole({ invitation, now, session });

            const [user] = await User.create(
                [
                    {
                        firstName,
                        lastName,
                        email: invitation.emailCanonical,
                        emailCanonical: invitation.emailCanonical,
                        emailVerifiedAt: now,
                        createdBy: invitation.invitedBy,
                        updatedBy: invitation.invitedBy,
                    },
                ],
                { session },
            );

            await AuthIdentity.create(
                [
                    {
                        user: user._id,
                        provider: AUTH_PROVIDER.LOCAL,
                        passwordHash,
                    },
                ],
                { session },
            );

            await createRegistrationLegalAcceptance({
                userId: user._id,
                source: LEGAL_ACCEPTANCE_SOURCE.WORKSPACE_INVITATION_REGISTRATION,
                ipAddress,
                userAgent,
                acceptedAt: now,
                session,
            });

            const membership = await activateWorkspaceMembership({
                invitation,
                role,
                userId: user._id,
                now,
                session,
            });

            await finalizeInvitationAcceptance({
                invitation,
                membership,
                role,
                userId: user._id,
                ipAddress,
                userAgent,
                now,
                session,
            });

            return {
                invitation,
                membership,
                user,
            };
        });
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'Un compte ou une appartenance existe déjà pour cette invitation.',
                409,
            );
        }

        throw error;
    }
};

export {
    acceptNewWorkspaceInvitation,
    acceptWorkspaceInvitation,
};
