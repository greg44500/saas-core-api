import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { PlatformRole } from '../platformRole/platformRole.model.js';
import { User } from '../users/user.model.js';
import {
    getPlatformRoleEffectivePermissions,
    resolvePlatformAuthorization,
} from './platformAuthorization.service.js';
import { PlatformTeamMember } from './platformTeamMember.model.js';


const CURRENT_MEMBER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

const applySession = (query, session) => (
    session ? query.session(session) : query
);

const assertActorHasPermission = ({ authorization, permission }) => {
    if (!authorization?.permissions?.includes(permission)) {
        throw new AppError(
            'Accès plateforme non autorisé',
            403,
        );
    }
};

const isSameId = (left, right) => (
    left?.toString() === right?.toString()
);

const isStrictPermissionSubset = ({
    candidatePermissions,
    actorPermissions,
}) => {
    const actorSet = new Set(actorPermissions);
    const candidateSet = new Set(candidatePermissions);

    return candidateSet.size < actorSet.size
        && [...candidateSet].every(
            (permission) => actorSet.has(permission),
        );
};

const loadActorAuthorization = async ({
    actorId,
    session,
}) => {
    const actorQuery = User.findById(actorId);
    const actor = await applySession(actorQuery, session);

    if (!actor) {
        throw new AppError('Utilisateur acteur introuvable.', 403);
    }

    const authorization = await resolvePlatformAuthorization({
        user: actor,
        session,
    });

    return { actor, authorization };
};

const loadCurrentMemberWithRole = async ({
    memberId,
    session,
}) => {
    const memberQuery = PlatformTeamMember.findOne({
        _id: memberId,
        status: mongoose.trusted({
            $in: CURRENT_MEMBER_STATUSES,
        }),
    });
    const member = await applySession(memberQuery, session);

    if (!member) {
        const existingQuery = PlatformTeamMember.findById(memberId);
        const existing = await applySession(existingQuery, session);

        if (!existing) {
            throw new AppError(
                'Membre de l’équipe de la Plateforme introuvable.',
                404,
            );
        }

        throw new AppError(
            'Ce membre n’est plus actif dans l’équipe de la Plateforme.',
            409,
        );
    }

    const roleQuery = PlatformRole.findById(member.role);
    const role = await applySession(roleQuery, session);

    if (!role) {
        throw new AppError(
            'Le rôle courant du membre est introuvable.',
            409,
        );
    }

    return { member, role };
};

const assertActorCanManageMember = ({
    actorId,
    authorization,
    targetMember,
    targetRole,
}) => {
    if (targetMember.isFounder) {
        throw new AppError(
            'Le Fondateur ne peut pas être modifié par une opération administrative ordinaire.',
            403,
        );
    }

    if (isSameId(targetMember.user, actorId)) {
        throw new AppError(
            'Vous ne pouvez pas modifier votre propre appartenance à l’équipe de la Plateforme.',
            403,
        );
    }

    if (authorization.roleKey === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        return;
    }

    if (targetRole.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        throw new AppError(
            'Seul un Super administrateur peut gérer un autre Super administrateur.',
            403,
        );
    }

    const targetPermissions = getPlatformRoleEffectivePermissions(
        targetRole,
    );

    if (!isStrictPermissionSubset({
        candidatePermissions: targetPermissions,
        actorPermissions: authorization.permissions,
    })) {
        throw new AppError(
            'Vous ne pouvez gérer qu’un membre disposant de droits strictement inférieurs aux vôtres.',
            403,
        );
    }
};

const assertActorCanAssignRole = ({
    authorization,
    role,
}) => {
    if (!role || role.status !== PLATFORM_ROLE_STATUS.ACTIVE) {
        throw new AppError(
            'Le rôle de Plateforme sélectionné n’est pas assignable.',
            409,
        );
    }

    const rolePermissions = getPlatformRoleEffectivePermissions(role);

    if (authorization.roleKey === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        return rolePermissions;
    }

    if (role.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        throw new AppError(
            'Seul un Super administrateur peut attribuer le rôle Super administrateur.',
            403,
        );
    }

    if (!isStrictPermissionSubset({
        candidatePermissions: rolePermissions,
        actorPermissions: authorization.permissions,
    })) {
        throw new AppError(
            'Vous ne pouvez attribuer qu’un rôle disposant de droits strictement inférieurs aux vôtres.',
            403,
        );
    }

    return rolePermissions;
};

const assertSuperAdminCanBeRemoved = async ({
    targetRole,
    session,
}) => {
    if (targetRole.key !== PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        return;
    }

    const superAdminRoleQuery = PlatformRole.findOne({
        key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        status: PLATFORM_ROLE_STATUS.ACTIVE,
    });
    const superAdminRole = await applySession(
        superAdminRoleQuery,
        session,
    );

    if (!superAdminRole) {
        throw new AppError(
            'Le rôle Super administrateur est indisponible.',
            409,
        );
    }

    const countQuery = PlatformTeamMember.countDocuments({
        role: superAdminRole._id,
        status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    });
    const activeSuperAdmins = await applySession(countQuery, session);

    if (activeSuperAdmins <= 1) {
        throw new AppError(
            'La Plateforme doit conserver au moins un Super administrateur actif.',
            409,
        );
    }
};


const listPlatformTeamMembers = async ({
    page = 1,
    limit = 20,
} = {}) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError('page must be an integer greater than or equal to 1');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError('limit must be an integer between 1 and 100');
    }

    const filter = {
        status: mongoose.trusted({
            $in: CURRENT_MEMBER_STATUSES,
        }),
    };
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
        PlatformTeamMember.find(filter)
            .populate({
                path: 'user',
                select: 'firstName lastName email emailCanonical status',
            })
            .populate({
                path: 'role',
                select: 'key name description status isSystem permissions',
            })
            .sort({ isFounder: -1, createdAt: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        PlatformTeamMember.countDocuments(filter),
    ]);

    return {
        members,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};


const updatePlatformTeamMemberRole = async ({
    memberId,
    roleId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!memberId || !roleId || !actorId) {
        throw new TypeError(
            'memberId, roleId and actorId are required to update a Platform member role',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
        });

        const { member, role: currentRole } =
            await loadCurrentMemberWithRole({
                memberId,
                session,
            });

        assertActorCanManageMember({
            actorId,
            authorization,
            targetMember: member,
            targetRole: currentRole,
        });

        const nextRoleQuery = PlatformRole.findById(roleId);
        const nextRole = await applySession(nextRoleQuery, session);
        assertActorCanAssignRole({ authorization, role: nextRole });

        if (isSameId(currentRole._id, nextRole._id)) {
            throw new AppError(
                'Ce membre possède déjà ce rôle.',
                409,
            );
        }

        if (
            currentRole.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN
            && nextRole.key !== PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN
        ) {
            await assertSuperAdminCanBeRemoved({
                targetRole: currentRole,
                session,
            });
        }

        const previousRoleId = currentRole._id.toString();
        const previousRoleKey = currentRole.key;

        member.role = nextRole._id;
        member.updatedBy = actorId;
        await member.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_MEMBER_ROLE_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_TEAM_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    previousRoleId,
                    previousRoleKey,
                    nextRoleId: nextRole._id.toString(),
                    nextRoleKey: nextRole.key,
                    changedAt: now,
                },
            },
            { session },
        );

        return { member, role: nextRole };
    });
};


const suspendPlatformTeamMember = async ({
    memberId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!memberId || !actorId) {
        throw new TypeError(
            'memberId and actorId are required to suspend a Platform member',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({ actorId, session });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND,
        });

        const { member, role } = await loadCurrentMemberWithRole({
            memberId,
            session,
        });
        assertActorCanManageMember({
            actorId,
            authorization,
            targetMember: member,
            targetRole: role,
        });

        if (member.status !== PLATFORM_TEAM_MEMBER_STATUS.ACTIVE) {
            throw new AppError('Ce membre n’est pas actif.', 409);
        }

        await assertSuperAdminCanBeRemoved({
            targetRole: role,
            session,
        });

        member.status = PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED;
        member.suspendedAt = now;
        member.suspendedBy = actorId;
        member.updatedBy = actorId;
        await member.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_MEMBER_SUSPENDED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_TEAM_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleId: role._id.toString(),
                    roleKey: role.key,
                    suspendedAt: now,
                },
            },
            { session },
        );

        return { member, role };
    });
};


const reactivatePlatformTeamMember = async ({
    memberId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!memberId || !actorId) {
        throw new TypeError(
            'memberId and actorId are required to reactivate a Platform member',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({ actorId, session });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_MEMBER_REACTIVATE,
        });

        const { member, role } = await loadCurrentMemberWithRole({
            memberId,
            session,
        });
        assertActorCanManageMember({
            actorId,
            authorization,
            targetMember: member,
            targetRole: role,
        });

        if (member.status !== PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED) {
            throw new AppError('Ce membre n’est pas suspendu.', 409);
        }

        assertActorCanAssignRole({ authorization, role });

        member.status = PLATFORM_TEAM_MEMBER_STATUS.ACTIVE;
        member.suspendedAt = null;
        member.suspendedBy = null;
        member.updatedBy = actorId;
        await member.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_MEMBER_REACTIVATED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_TEAM_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleId: role._id.toString(),
                    roleKey: role.key,
                    reactivatedAt: now,
                },
            },
            { session },
        );

        return { member, role };
    });
};


const revokePlatformTeamMember = async ({
    memberId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!memberId || !actorId) {
        throw new TypeError(
            'memberId and actorId are required to revoke a Platform member',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({ actorId, session });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.TEAM_MEMBER_REVOKE,
        });

        const { member, role } = await loadCurrentMemberWithRole({
            memberId,
            session,
        });
        assertActorCanManageMember({
            actorId,
            authorization,
            targetMember: member,
            targetRole: role,
        });

        await assertSuperAdminCanBeRemoved({
            targetRole: role,
            session,
        });

        member.status = PLATFORM_TEAM_MEMBER_STATUS.REVOKED;
        member.revokedAt = now;
        member.revokedBy = actorId;
        member.updatedBy = actorId;
        await member.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_MEMBER_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_TEAM_MEMBER,
                entityId: member._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleId: role._id.toString(),
                    roleKey: role.key,
                    revokedAt: now,
                },
            },
            { session },
        );

        return { member, role };
    });
};


export {
    assertActorCanAssignRole,
    assertActorCanManageMember,
    listPlatformTeamMembers,
    reactivatePlatformTeamMember,
    revokePlatformTeamMember,
    suspendPlatformTeamMember,
    updatePlatformTeamMemberRole,
};
