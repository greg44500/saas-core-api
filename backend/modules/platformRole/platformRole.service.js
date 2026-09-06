import { randomUUID } from 'node:crypto';

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
} from '../../constants/platformTeam.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    getPlatformRoleEffectivePermissions,
    resolvePlatformAuthorization,
} from '../platformTeam/platformAuthorization.service.js';
import { PlatformTeamMember } from '../platformTeam/platformTeamMember.model.js';
import { User } from '../users/user.model.js';
import { PlatformRole } from './platformRole.model.js';
import {
    assertCanGovernCustomPlatformRoles,
    assertCustomPlatformRoleDescription,
    assertCustomPlatformRoleIsMutable,
    assertCustomPlatformRolePermissions,
    haveSamePermissionSet,
} from './platformRole.policy.js';


const ASSIGNED_MEMBER_STATUSES = Object.freeze([
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

const loadActorAuthorization = async ({ actorId, session }) => {
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

const generateCustomPlatformRoleKey = () => (
    `custom_${randomUUID()}`
);

const serializePlatformRole = (role) => ({
    id: role._id.toString(),
    key: role.key,
    name: role.name,
    description: role.description ?? null,
    permissions: Array.isArray(role.permissions)
        ? [...role.permissions]
        : [],
    isSystem: role.isSystem === true,
    status: role.status,
    createdBy: role.createdBy?.toString() ?? null,
    updatedBy: role.updatedBy?.toString() ?? null,
    archivedAt: role.archivedAt ?? null,
    archivedBy: role.archivedBy?.toString() ?? null,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
});

/**
 * Un rôle personnalisé ne doit pas être une copie sémantique d'un rôle actif.
 * Le contrôle compare les permissions comme des ensembles afin que leur ordre
 * de présentation ne permette jamais de contourner la règle métier.
 */
const assertNoActivePlatformRolePermissionClone = async ({
    permissions,
    excludeRoleId = null,
    session = null,
}) => {
    const activeRolesQuery = PlatformRole.find({
        status: PLATFORM_ROLE_STATUS.ACTIVE,
    });
    const activeRoles = await applySession(activeRolesQuery, session);
    const excludedId = excludeRoleId?.toString() ?? null;

    const duplicateRole = activeRoles.find((role) => {
        if (
            excludedId
            && role._id?.toString() === excludedId
        ) {
            return false;
        }

        const existingPermissions = getPlatformRoleEffectivePermissions(role);

        return haveSamePermissionSet({
            leftPermissions: permissions,
            rightPermissions: existingPermissions,
        });
    });

    if (duplicateRole) {
        throw new AppError(
            'Un rôle actif possède déjà exactement ce jeu de permissions.',
            409,
        );
    }
};

const listPlatformRoles = async ({
    page = 1,
    limit = 20,
    status,
} = {}) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError(
            'page must be an integer greater than or equal to 1',
        );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError(
            'limit must be an integer between 1 and 100',
        );
    }

    if (
        status !== undefined
        && !Object.values(PLATFORM_ROLE_STATUS).includes(status)
    ) {
        throw new TypeError('status must be a valid Platform role status');
    }

    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
        PlatformRole.find(filter)
            .sort({ isSystem: -1, name: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        PlatformRole.countDocuments(filter),
    ]);

    return {
        roles: roles.map(serializePlatformRole),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getPlatformRoleById = async ({ roleId }) => {
    if (!roleId) {
        throw new TypeError('roleId is required to read a Platform role');
    }

    const role = await PlatformRole.findById(roleId).lean();

    if (!role) {
        throw new AppError('Rôle de Plateforme introuvable.', 404);
    }

    return serializePlatformRole(role);
};

const createCustomPlatformRole = async ({
    roleData,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!roleData || !actorId) {
        throw new TypeError(
            'roleData and actorId are required to create a Platform role',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.ROLES_CREATE,
        });
        assertCanGovernCustomPlatformRoles({ authorization });

        const description = assertCustomPlatformRoleDescription(
            roleData.description,
        );
        const permissions = assertCustomPlatformRolePermissions({
            authorization,
            permissions: roleData.permissions ?? [],
        });

        await assertNoActivePlatformRolePermissionClone({
            permissions,
            session,
        });

        const key = generateCustomPlatformRoleKey();

        const [role] = await PlatformRole.create([
            {
                key,
                name: roleData.name,
                description,
                permissions: [...permissions],
                isSystem: false,
                status: PLATFORM_ROLE_STATUS.ACTIVE,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_ROLE_CREATED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_ROLE,
                entityId: role._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    permissionCount: permissions.length,
                },
            },
            { session },
        );

        return serializePlatformRole(role);
    });
};

const updateCustomPlatformRole = async ({
    roleId,
    roleData,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!roleId || !roleData || !actorId) {
        throw new TypeError(
            'roleId, roleData and actorId are required to update a Platform role',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.ROLES_UPDATE,
        });
        assertCanGovernCustomPlatformRoles({ authorization });

        const roleQuery = PlatformRole.findById(roleId);
        const role = await applySession(roleQuery, session);

        if (!role) {
            throw new AppError('Rôle de Plateforme introuvable.', 404);
        }

        const currentPermissions = assertCustomPlatformRoleIsMutable({
            authorization,
            role,
        });

        const nextPermissions = Object.hasOwn(roleData, 'permissions')
            ? assertCustomPlatformRolePermissions({
                authorization,
                permissions: roleData.permissions,
            })
            : currentPermissions;
        const nextDescription = Object.hasOwn(roleData, 'description')
            ? assertCustomPlatformRoleDescription(roleData.description)
            : assertCustomPlatformRoleDescription(role.description);

        await assertNoActivePlatformRolePermissionClone({
            permissions: nextPermissions,
            excludeRoleId: role._id,
            session,
        });

        if (Object.hasOwn(roleData, 'permissions')) {
            role.permissions = [...nextPermissions];
        }

        if (Object.hasOwn(roleData, 'name')) {
            role.name = roleData.name;
        }

        if (Object.hasOwn(roleData, 'description')) {
            role.description = nextDescription;
        }

        role.updatedBy = actorId;
        await role.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_ROLE_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_ROLE,
                entityId: role._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    updatedFields: Object.keys(roleData),
                },
            },
            { session },
        );

        return serializePlatformRole(role);
    });
};

const archiveCustomPlatformRole = async ({
    roleId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!roleId || !actorId) {
        throw new TypeError(
            'roleId and actorId are required to archive a Platform role',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const { authorization } = await loadActorAuthorization({
            actorId,
            session,
        });
        assertActorHasPermission({
            authorization,
            permission: PLATFORM_PERMISSION.ROLES_ARCHIVE,
        });
        assertCanGovernCustomPlatformRoles({ authorization });

        const roleQuery = PlatformRole.findById(roleId);
        const role = await applySession(roleQuery, session);

        if (!role) {
            throw new AppError('Rôle de Plateforme introuvable.', 404);
        }

        assertCustomPlatformRoleIsMutable({
            authorization,
            role,
        });

        const usageQuery = PlatformTeamMember.countDocuments({
            role: role._id,
            status: mongoose.trusted({
                $in: ASSIGNED_MEMBER_STATUSES,
            }),
        });
        const assignedMembers = await applySession(
            usageQuery,
            session,
        );

        if (assignedMembers > 0) {
            throw new AppError(
                'Ce rôle ne peut pas être archivé tant qu’il est attribué à un membre actif ou suspendu.',
                409,
            );
        }

        role.status = PLATFORM_ROLE_STATUS.ARCHIVED;
        role.archivedAt = now;
        role.archivedBy = actorId;
        role.updatedBy = actorId;
        await role.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.PLATFORM_ROLE_ARCHIVED,
                entityType: AUDIT_ENTITY_TYPE.PLATFORM_ROLE,
                entityId: role._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    roleKey: role.key,
                    archivedAt: now,
                },
            },
            { session },
        );

        return serializePlatformRole(role);
    });
};


export {
    archiveCustomPlatformRole,
    assertNoActivePlatformRolePermissionClone,
    createCustomPlatformRole,
    generateCustomPlatformRoleKey,
    getPlatformRoleById,
    listPlatformRoles,
    serializePlatformRole,
    updateCustomPlatformRole,
};
