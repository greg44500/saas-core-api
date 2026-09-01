import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    SYSTEM_ROLE_DEFINITIONS,
} from '../../constants/role.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    WorkspaceInvitation,
} from '../workspaceInvitation/workspaceInvitation.model.js';
import {
    WorkspaceMember,
} from '../workspaceMember/workspaceMember.model.js';
import { Role } from './role.model.js';
import {
    ACTIVE_ROLE_PERMISSIONS,
    RESERVED_CUSTOM_ROLE_PERMISSIONS,
} from './rolePermission.registry.js';

const toRoleDto = (role) => ({
    id: role._id.toString(),
    key: role.key,
    name: role.name,
    description: role.description ?? null,
    permissions: Array.isArray(role.permissions)
        ? [...role.permissions]
        : [],
    isSystem: role.isSystem,
    isEditable: role.isEditable,
});

const normalizePermissions = (permissions = []) => [
    ...new Set(permissions.map((permission) => permission.trim().toLowerCase())),
];

const assertCustomRolePermissions = ({
    permissions,
    actorPermissions,
}) => {
    if (!Array.isArray(actorPermissions)) {
        throw new AppError('Contexte de permissions indisponible', 403);
    }

    const normalizedPermissions = normalizePermissions(permissions);
    const activePermissionSet = new Set(ACTIVE_ROLE_PERMISSIONS);
    const actorPermissionSet = new Set(actorPermissions);
    const reservedPermissionSet = new Set(RESERVED_CUSTOM_ROLE_PERMISSIONS);

    const unknownPermission = normalizedPermissions.find(
        (permission) => !activePermissionSet.has(permission),
    );

    if (unknownPermission) {
        throw new AppError(
            `Permission inconnue ou inactive : ${unknownPermission}`,
            400,
        );
    }

    const reservedPermission = normalizedPermissions.find(
        (permission) => reservedPermissionSet.has(permission),
    );

    if (reservedPermission) {
        throw new AppError(
            'Cette permission de gouvernance ne peut pas être attribuée à un rôle personnalisé.',
            403,
        );
    }

    const escalatedPermission = normalizedPermissions.find(
        (permission) => !actorPermissionSet.has(permission),
    );

    if (escalatedPermission) {
        throw new AppError(
            'Vous ne pouvez pas attribuer un rôle contenant des permissions que vous ne possédez pas.',
            403,
        );
    }

    return normalizedPermissions;
};

const assertEditableCustomRole = (role) => {
    if (!role) {
        throw new AppError('Rôle introuvable dans ce workspace.', 404);
    }

    if (role.isSystem || role.isEditable !== true) {
        throw new AppError(
            'Les rôles système ne peuvent pas être modifiés ou supprimés.',
            409,
        );
    }
};

/**
 * Crée les rôles système appartenant à un nouveau workspace.
 */
const createSystemRolesForWorkspace = async ({
    workspaceId,
    actorId,
    session,
}) => {
    if (!workspaceId || !actorId || !session) {
        throw new TypeError(
            'workspaceId, actorId and session are required to create system roles',
        );
    }

    const rolesToCreate = SYSTEM_ROLE_DEFINITIONS.map((definition) => ({
        workspace: workspaceId,
        key: definition.key,
        name: definition.name,
        description: definition.description,
        permissions: [...definition.permissions],
        isSystem: definition.isSystem,
        isEditable: definition.isEditable,
        createdBy: actorId,
        updatedBy: actorId,
    }));

    return Role.insertMany(rolesToCreate, {
        session,
    });
};

const listWorkspaceRoles = async ({ workspaceId }) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to list workspace roles',
        );
    }

    const roles = await Role.find({
        workspace: workspaceId,
        deletedAt: null,
    })
        .select('_id key name description permissions isSystem isEditable')
        .sort({ isSystem: -1, name: 1, _id: 1 })
        .lean();

    return roles.map(toRoleDto);
};

const createWorkspaceRole = async ({
    workspaceId,
    actorId,
    actorPermissions,
    name,
    description = null,
    permissions = [],
    ipAddress = null,
    userAgent = null,
}) => mongoose.connection.transaction(async (session) => {
    const normalizedPermissions = assertCustomRolePermissions({
        permissions,
        actorPermissions,
    });

    const role = new Role({
        workspace: workspaceId,
        key: `custom-${new mongoose.Types.ObjectId().toString()}`,
        name,
        description,
        permissions: normalizedPermissions,
        isSystem: false,
        isEditable: true,
        createdBy: actorId,
        updatedBy: actorId,
    });

    await role.save({ session });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspaceId,
            action: AUDIT_ACTION.ROLE_CREATED,
            entityType: AUDIT_ENTITY_TYPE.ROLE,
            entityId: role._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
        },
        { session },
    );

    return toRoleDto(role);
});

const updateWorkspaceRole = async ({
    workspaceId,
    roleId,
    actorId,
    actorPermissions,
    changes,
    ipAddress = null,
    userAgent = null,
}) => mongoose.connection.transaction(async (session) => {
    const role = await Role.findOne({
        _id: roleId,
        workspace: workspaceId,
        deletedAt: null,
    }).session(session);

    assertEditableCustomRole(role);

    if (changes.permissions !== undefined) {
        role.permissions = assertCustomRolePermissions({
            permissions: changes.permissions,
            actorPermissions,
        });
    }

    if (changes.name !== undefined) {
        role.name = changes.name;
    }

    if (changes.description !== undefined) {
        role.description = changes.description;
    }

    role.updatedBy = actorId;
    await role.save({ session });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspaceId,
            action: AUDIT_ACTION.ROLE_UPDATED,
            entityType: AUDIT_ENTITY_TYPE.ROLE,
            entityId: role._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
        },
        { session },
    );

    return toRoleDto(role);
});

const deleteWorkspaceRole = async ({
    workspaceId,
    roleId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => mongoose.connection.transaction(async (session) => {
    const role = await Role.findOne({
        _id: roleId,
        workspace: workspaceId,
        deletedAt: null,
    }).session(session);

    assertEditableCustomRole(role);

    const activeMembership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        role: roleId,
        status: mongoose.trusted({
            $in: [
                WORKSPACE_MEMBER_STATUS.ACTIVE,
                WORKSPACE_MEMBER_STATUS.SUSPENDED,
            ],
        }),
    })
        .select('_id')
        .session(session);

    if (activeMembership) {
        throw new AppError(
            'Ce rôle est encore attribué à un membre actif ou suspendu.',
            409,
        );
    }

    const pendingInvitation = await WorkspaceInvitation.findOne({
        workspace: workspaceId,
        role: roleId,
        status: WORKSPACE_INVITATION_STATUS.PENDING,
    })
        .select('_id')
        .session(session);

    if (pendingInvitation) {
        throw new AppError(
            'Ce rôle est encore utilisé par une invitation en attente.',
            409,
        );
    }

    role.deletedAt = new Date();
    role.deletedBy = actorId;
    role.updatedBy = actorId;
    await role.save({ session });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspaceId,
            action: AUDIT_ACTION.ROLE_DELETED,
            entityType: AUDIT_ENTITY_TYPE.ROLE,
            entityId: role._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
        },
        { session },
    );

    return role;
});

export {
    assertCustomRolePermissions,
    createSystemRolesForWorkspace,
    createWorkspaceRole,
    deleteWorkspaceRole,
    listWorkspaceRoles,
    updateWorkspaceRole,
};
