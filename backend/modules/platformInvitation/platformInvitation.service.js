import crypto from 'node:crypto';

import mongoose from 'mongoose';

import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import {
    PLATFORM_INVITATION_DELIVERY_STATUS,
    PLATFORM_INVITATION_STATUS,
    PLATFORM_INVITATION_TOKEN_BYTES,
    PLATFORM_INVITATION_TTL_DAYS,
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { User } from '../users/user.model.js';
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
import { PlatformInvitation } from './platformInvitation.model.js';


const DAY_IN_MS = 24 * 60 * 60 * 1000;

const hashPlatformInvitationToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const generatePlatformInvitationToken = () => crypto
    .randomBytes(PLATFORM_INVITATION_TOKEN_BYTES)
    .toString('hex');

const ACTIVE_MEMBER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

const RESERVED_PERMISSION_KEYS = new Set(
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions
        .filter(({ sensitivity }) => sensitivity === 'reserved')
        .map(({ key }) => key),
);

const ACTIVE_PERMISSION_KEYS = new Set(
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions
        .map(({ key }) => key),
);


/**
 * Vérifie la cohérence structurelle d'un rôle au point d'usage.
 *
 * Cette fonction reste exportée pour les tests unitaires du contrat A3. La
 * délégation runtime complète utilise désormais assertActorCanAssignRole(), qui
 * s'appuie sur l'autorité PlatformTeamMember courante.
 */
const assertAssignablePlatformRole = ({
    role,
    actorPlatformRole = null,
}) => {
    if (!role || role.status !== PLATFORM_ROLE_STATUS.ACTIVE) {
        throw new AppError(
            'Le rôle de Plateforme sélectionné n’est pas assignable.',
            409,
        );
    }

    const hasUnknownPermission = role.permissions.some(
        (permission) => !ACTIVE_PERMISSION_KEYS.has(permission),
    );

    if (hasUnknownPermission) {
        throw new AppError(
            'Le rôle de Plateforme contient une permission inconnue.',
            409,
        );
    }

    if (role.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        if (actorPlatformRole !== PLATFORM_ROLE.SUPER_ADMIN) {
            throw new AppError(
                'Seul un Super administrateur peut inviter un autre Super administrateur.',
                403,
            );
        }

        return;
    }

    const containsReservedPermission = role.permissions.some(
        (permission) => RESERVED_PERMISSION_KEYS.has(permission),
    );

    if (containsReservedPermission) {
        throw new AppError(
            'Ce rôle de Plateforme contient une permission réservée.',
            409,
        );
    }
};

const assertRuntimePermission = ({ authorization, permission }) => {
    if (!authorization?.permissions?.includes(permission)) {
        throw new AppError('Accès plateforme non autorisé', 403);
    }
};

const loadActorAuthorization = async ({ actorId, session }) => {
    const actor = await User.findById(actorId)
        .select('_id platformRole status')
        .session(session);

    if (!actor) {
        throw new AppError('Utilisateur acteur introuvable.', 403);
    }

    const authorization = await resolvePlatformAuthorization({
        user: actor,
        session,
    });

    return { actor, authorization };
};


const expirePendingPlatformInvitations = async ({
    emailCanonical = null,
    now = new Date(),
    session = null,
} = {}) => {
    const filter = {
        status: PLATFORM_INVITATION_STATUS.PENDING,
        expiresAt: mongoose.trusted({
            $lte: now,
        }),
    };

    if (emailCanonical) {
        filter.emailCanonical = emailCanonical;
    }

    let query = PlatformInvitation.updateMany(
        filter,
        {
            $set: {
                status: PLATFORM_INVITATION_STATUS.EXPIRED,
            },
        },
        {
            runValidators: true,
        },
    );

    if (session) {
        query = query.session(session);
    }

    return query;
};


const createPlatformInvitation = async ({
    firstName,
    lastName,
    email,
    roleId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!firstName || !lastName || !email || !roleId || !actorId) {
        throw new TypeError(
            'firstName, lastName, email, roleId and actorId are required to create a platform invitation',
        );
    }

    const emailCanonical = canonicalizeEmail(email);

    return mongoose.connection.transaction(async (session) => {
        // Une session transactionnelle MongoDB ne doit pas exécuter plusieurs
        // opérations en parallèle. Chaque lecture est donc volontairement
        // séquencée avant de poursuivre le workflow atomique.
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        const role = await PlatformRole.findById(roleId).session(session);

        assertRuntimePermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_INVITE,
        });
        assertActorCanAssignRole({ authorization, role });

        const existingUser = await User.findOne({
            emailCanonical,
        })
            .select('_id')
            .session(session);

        if (existingUser) {
            const existingMembership = await PlatformTeamMember.findOne({
                user: existingUser._id,
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
        }

        await expirePendingPlatformInvitations({
            emailCanonical,
            now,
            session,
        });

        const pendingInvitation = await PlatformInvitation.findOne({
            emailCanonical,
            status: PLATFORM_INVITATION_STATUS.PENDING,
        }).session(session);

        if (pendingInvitation) {
            throw new AppError(
                'Une invitation active existe déjà pour cette adresse email.',
                409,
            );
        }

        const token = generatePlatformInvitationToken();
        const expiresAt = new Date(
            now.getTime()
            + PLATFORM_INVITATION_TTL_DAYS * DAY_IN_MS,
        );

        let invitation;

        try {
            [invitation] = await PlatformInvitation.create(
                [
                    {
                        firstName,
                        lastName,
                        emailCanonical,
                        role: role._id,
                        tokenHash: hashPlatformInvitationToken(token),
                        invitedBy: actorId,
                        expiresAt,
                    },
                ],
                { session },
            );
        } catch (error) {
            if (error?.code === 11000) {
                throw new AppError(
                    'Une invitation active existe déjà pour cette adresse email.',
                    409,
                );
            }

            throw error;
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: null,
                action: AUDIT_ACTION.PLATFORM_INVITATION_CREATED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleId: role._id.toString(),
                    roleKey: role.key,
                    expiresAt,
                },
            },
            { session },
        );

        return {
            invitation,
            role,
            token,
        };
    });
};


const listPendingPlatformInvitations = async ({
    page = 1,
    limit = 20,
    now = new Date(),
} = {}) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError('page must be an integer greater than or equal to 1');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError('limit must be an integer between 1 and 100');
    }

    await expirePendingPlatformInvitations({ now });

    const skip = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
        PlatformInvitation.find({
            status: PLATFORM_INVITATION_STATUS.PENDING,
        })
            .select(
                'firstName lastName emailCanonical role status deliveryStatus lastDeliveryAttemptAt deliveredAt expiresAt createdAt',
            )
            .populate({
                path: 'role',
                select: 'key name',
            })
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        PlatformInvitation.countDocuments({
            status: PLATFORM_INVITATION_STATUS.PENDING,
        }),
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


const revokePlatformInvitation = async ({
    invitationId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!invitationId || !actorId) {
        throw new TypeError(
            'invitationId and actorId are required to revoke a platform invitation',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        assertRuntimePermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
        });

        const invitation = await PlatformInvitation.findOneAndUpdate(
            {
                _id: invitationId,
                status: PLATFORM_INVITATION_STATUS.PENDING,
                expiresAt: mongoose.trusted({ $gt: now }),
            },
            {
                $set: {
                    status: PLATFORM_INVITATION_STATUS.REVOKED,
                    revokedBy: actorId,
                    revokedAt: now,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!invitation) {
            const existingInvitation = await PlatformInvitation.findById(
                invitationId,
            ).session(session);

            if (!existingInvitation) {
                throw new AppError('Invitation introuvable.', 404);
            }

            throw new AppError(
                'Cette invitation n’est plus active.',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: null,
                action: AUDIT_ACTION.PLATFORM_INVITATION_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
            },
            { session },
        );

        return invitation;
    });
};


const resendPlatformInvitation = async ({
    invitationId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!invitationId || !actorId) {
        throw new TypeError(
            'invitationId and actorId are required to resend a platform invitation',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        const invitation = await PlatformInvitation.findById(
            invitationId,
        ).session(session);

        assertRuntimePermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
        });

        if (!invitation) {
            throw new AppError('Invitation introuvable.', 404);
        }

        if (
            invitation.status !== PLATFORM_INVITATION_STATUS.PENDING
            || invitation.expiresAt <= now
        ) {
            throw new AppError(
                'Cette invitation n’est plus active.',
                409,
            );
        }

        const role = await PlatformRole.findById(invitation.role)
            .session(session);
        assertActorCanAssignRole({ authorization, role });

        const token = generatePlatformInvitationToken();
        const expiresAt = new Date(
            now.getTime()
            + PLATFORM_INVITATION_TTL_DAYS * DAY_IN_MS,
        );

        invitation.tokenHash = hashPlatformInvitationToken(token);
        invitation.expiresAt = expiresAt;
        invitation.deliveryStatus =
            PLATFORM_INVITATION_DELIVERY_STATUS.PENDING;
        invitation.lastDeliveryAttemptAt = null;
        invitation.deliveredAt = null;

        await invitation.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                workspace: null,
                action: AUDIT_ACTION.PLATFORM_INVITATION_RESENT,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleId: role._id.toString(),
                    expiresAt,
                },
            },
            { session },
        );

        return {
            invitation,
            role,
            token,
        };
    });
};


export {
    assertAssignablePlatformRole,
    createPlatformInvitation,
    expirePendingPlatformInvitations,
    generatePlatformInvitationToken,
    hashPlatformInvitationToken,
    listPendingPlatformInvitations,
    resendPlatformInvitation,
    revokePlatformInvitation,
};
