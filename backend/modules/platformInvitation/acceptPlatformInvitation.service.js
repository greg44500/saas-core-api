import mongoose from 'mongoose';

import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    PLATFORM_INVITATION_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import { AppError } from '../../utils/appError.js';
import { hashPassword } from '../../utils/password.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { AuthIdentity } from '../authIdentities/authIdentity.model.js';
import { PlatformRole } from '../platformRole/platformRole.model.js';
import {
    resolvePlatformAuthorization,
} from '../platformTeam/platformAuthorization.service.js';
import {
    assertActorCanAssignRole,
} from '../platformTeam/platformTeam.service.js';
import {
    PlatformTeamMember,
} from '../platformTeam/platformTeamMember.model.js';
import { User } from '../users/user.model.js';
import { PlatformInvitation } from './platformInvitation.model.js';
import {
    hashPlatformInvitationToken,
} from './platformInvitation.service.js';


const ACTIVE_MEMBER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);


const loadAcceptableInvitation = async ({
    tokenHash,
    now,
    session,
}) => {
    const invitation = await PlatformInvitation.findOne({
        tokenHash,
        status: PLATFORM_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({ $gt: now }),
    }).session(session);

    if (!invitation) {
        throw new AppError(
            'Invitation invalide, expirée ou déjà utilisée.',
            409,
        );
    }

    // Les lectures partageant une session transactionnelle restent
    // séquentielles : MongoDB/Mongoose ne garantit pas le parallélisme dans une
    // transaction et peut invalider le numéro de transaction actif.
    const role = await PlatformRole.findById(invitation.role)
        .session(session);
    const inviter = await User.findById(invitation.invitedBy)
        .select('_id platformRole status')
        .session(session);

    if (!inviter || inviter.status !== USER_STATUS.ACTIVE) {
        throw new AppError(
            'Cette invitation n’est plus autorisée.',
            409,
        );
    }

    /**
     * L'autorité de l'invitant est recontrôlée depuis PlatformTeamMember au
     * moment où les privilèges deviennent effectifs. Une ancienne invitation
     * ne survit donc pas à la suspension ou à la révocation de son créateur.
     */
    const inviterAuthorization = await resolvePlatformAuthorization({
        user: inviter,
        session,
    });
    assertActorCanAssignRole({
        authorization: inviterAuthorization,
        role,
    });

    return {
        invitation,
        role,
    };
};


const assertNoActivePlatformMembership = async ({
    userId,
    session,
}) => {
    const existingMembership = await PlatformTeamMember.findOne({
        user: userId,
        status: mongoose.trusted({
            $in: ACTIVE_MEMBER_STATUSES,
        }),
    }).session(session);

    if (existingMembership) {
        throw new AppError(
            'Cet utilisateur appartient déjà à l’équipe de la Plateforme.',
            409,
        );
    }
};


const createPlatformMembership = async ({
    userId,
    roleId,
    invitedBy,
    now,
    session,
}) => {
    try {
        const [membership] = await PlatformTeamMember.create(
            [
                {
                    user: userId,
                    role: roleId,
                    status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    isFounder: false,
                    joinedAt: now,
                    createdBy: invitedBy,
                    updatedBy: invitedBy,
                },
            ],
            { session },
        );

        return membership;
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'Cet utilisateur appartient déjà à l’équipe de la Plateforme.',
                409,
            );
        }

        throw error;
    }
};


const finalizePlatformInvitationAcceptance = async ({
    invitation,
    role,
    userId,
    membership,
    ipAddress,
    userAgent,
    now,
    session,
}) => {
    invitation.status = PLATFORM_INVITATION_STATUS.ACCEPTED;
    invitation.acceptedBy = userId;
    invitation.acceptedAt = now;

    await invitation.save({ session });

    await createAuditLog(
        {
            actor: userId,
            workspace: null,
            action: AUDIT_ACTION.PLATFORM_INVITATION_ACCEPTED,
            entityType: AUDIT_ENTITY_TYPE.PLATFORM_INVITATION,
            entityId: invitation._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                membershipId: membership._id.toString(),
                roleId: role._id.toString(),
                roleKey: role.key,
            },
        },
        { session },
    );
};


const acceptExistingPlatformInvitation = async ({
    token,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!token || !actorId) {
        throw new TypeError(
            'token and actorId are required to accept an existing-user platform invitation',
        );
    }

    const tokenHash = hashPlatformInvitationToken(token);

    return mongoose.connection.transaction(async (session) => {
        const actor = await User.findById(actorId)
            .select('_id emailCanonical status')
            .session(session);

        if (!actor || actor.status !== USER_STATUS.ACTIVE) {
            throw new AppError('Utilisateur indisponible.', 403);
        }

        const { invitation, role } = await loadAcceptableInvitation({
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

        await assertNoActivePlatformMembership({
            userId: actor._id,
            session,
        });

        const membership = await createPlatformMembership({
            userId: actor._id,
            roleId: role._id,
            invitedBy: invitation.invitedBy,
            now,
            session,
        });

        await finalizePlatformInvitationAcceptance({
            invitation,
            role,
            userId: actor._id,
            membership,
            ipAddress,
            userAgent,
            now,
            session,
        });

        return {
            invitation,
            membership,
            role,
            user: actor,
        };
    });
};


const acceptNewPlatformInvitation = async ({
    token,
    password,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!token || !password) {
        throw new TypeError(
            'token and password are required to accept a new-user platform invitation',
        );
    }

    const tokenHash = hashPlatformInvitationToken(token);

    const invitationExists = await PlatformInvitation.exists({
        tokenHash,
        status: PLATFORM_INVITATION_STATUS.PENDING,
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
            const { invitation, role } = await loadAcceptableInvitation({
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

            const [user] = await User.create(
                [
                    {
                        firstName: invitation.firstName,
                        lastName: invitation.lastName,
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

            const membership = await createPlatformMembership({
                userId: user._id,
                roleId: role._id,
                invitedBy: invitation.invitedBy,
                now,
                session,
            });

            await finalizePlatformInvitationAcceptance({
                invitation,
                role,
                userId: user._id,
                membership,
                ipAddress,
                userAgent,
                now,
                session,
            });

            return {
                invitation,
                membership,
                role,
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
    acceptExistingPlatformInvitation,
    acceptNewPlatformInvitation,
};
