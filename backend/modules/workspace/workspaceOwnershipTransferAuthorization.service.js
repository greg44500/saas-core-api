import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { WORKSPACE_STATUS } from '../../constants/workspace.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { Workspace } from './workspace.model.js';


const WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS = Object.freeze({
    INACTIVE: 'inactive',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
    CONSUMED: 'consumed',
});


const resolveWorkspaceOwnershipTransferAuthorizationStatus = (
    authorization,
    now = new Date(),
) => {
    if (!authorization) {
        return WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS.INACTIVE;
    }

    if (authorization.consumedAt) {
        return WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS.CONSUMED;
    }

    if (authorization.revokedAt) {
        return WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS.REVOKED;
    }

    if (!authorization.expiresAt || authorization.expiresAt <= now) {
        return WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS.EXPIRED;
    }

    return WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS.ACTIVE;
};


/**
 * Produit le contrat HTTP minimal de la capacité exceptionnelle.
 *
 * Les identités techniques des acteurs restent dans AuditLog. Le client a
 * uniquement besoin du statut, de l'expiration et de l'identifiant de
 * corrélation nécessaire au backend pour garantir le single-use.
 */
const serializeWorkspaceOwnershipTransferAuthorization = (
    authorization,
    { now = new Date() } = {},
) => {
    const status = resolveWorkspaceOwnershipTransferAuthorizationStatus(
        authorization,
        now,
    );

    return {
        id: authorization?._id?.toString?.() ?? null,
        status,
        active:
            status
            === WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS.ACTIVE,
        authorizedAt: authorization?.authorizedAt ?? null,
        expiresAt: authorization?.expiresAt ?? null,
        revokedAt: authorization?.revokedAt ?? null,
        consumedAt: authorization?.consumedAt ?? null,
        ttlHours:
            env.WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS,
    };
};


const getWorkspaceOwnershipTransferAuthorization = async ({
    workspaceId,
    now = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to get ownership transfer authorization',
        );
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
        throw new AppError('Workspace introuvable', 404);
    }

    return serializeWorkspaceOwnershipTransferAuthorization(
        workspace.ownershipTransferAuthorization,
        { now },
    );
};


const authorizeWorkspaceOwnershipTransfer = async ({
    workspaceId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !actorId) {
        throw new TypeError(
            'workspaceId and actorId are required to authorize ownership transfer',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const workspace = await Workspace.findById(workspaceId).session(session);

        if (!workspace) {
            throw new AppError('Workspace introuvable', 404);
        }

        if (workspace.status !== WORKSPACE_STATUS.ACTIVE) {
            throw new AppError(
                'Le transfert de propriété ne peut être autorisé que pour un workspace actif',
                409,
            );
        }

        const currentState = serializeWorkspaceOwnershipTransferAuthorization(
            workspace.ownershipTransferAuthorization,
            { now },
        );

        if (currentState.active) {
            throw new AppError(
                'Une autorisation de transfert de propriété est déjà active pour ce workspace',
                409,
            );
        }

        const authorizationId = new mongoose.Types.ObjectId();
        const ttlHours =
            env.WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS;
        const expiresAt = new Date(
            now.getTime() + ttlHours * 60 * 60 * 1000,
        );

        workspace.ownershipTransferAuthorization = {
            _id: authorizationId,
            authorizedBy: actorId,
            authorizedAt: now,
            expiresAt,
            revokedAt: null,
            revokedBy: null,
            consumedAt: null,
            consumedBy: null,
        };
        workspace.updatedBy = actorId;
        await workspace.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspace._id,
                action:
                    AUDIT_ACTION.WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: workspace._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    authorizationId: authorizationId.toString(),
                    expiresAt: expiresAt.toISOString(),
                    ttlHours,
                },
            },
            { session },
        );

        return serializeWorkspaceOwnershipTransferAuthorization(
            workspace.ownershipTransferAuthorization,
            { now },
        );
    });
};


const revokeWorkspaceOwnershipTransferAuthorization = async ({
    workspaceId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !actorId) {
        throw new TypeError(
            'workspaceId and actorId are required to revoke ownership transfer authorization',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const workspace = await Workspace.findById(workspaceId).session(session);

        if (!workspace) {
            throw new AppError('Workspace introuvable', 404);
        }

        const currentState = serializeWorkspaceOwnershipTransferAuthorization(
            workspace.ownershipTransferAuthorization,
            { now },
        );

        if (!currentState.active) {
            throw new AppError(
                'Aucune autorisation active de transfert de propriété ne peut être révoquée',
                409,
            );
        }

        workspace.ownershipTransferAuthorization.revokedAt = now;
        workspace.ownershipTransferAuthorization.revokedBy = actorId;
        workspace.updatedBy = actorId;
        await workspace.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspace._id,
                action:
                    AUDIT_ACTION.WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: workspace._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    authorizationId: currentState.id,
                },
            },
            { session },
        );

        return serializeWorkspaceOwnershipTransferAuthorization(
            workspace.ownershipTransferAuthorization,
            { now },
        );
    });
};


export {
    WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_STATUS,
    authorizeWorkspaceOwnershipTransfer,
    getWorkspaceOwnershipTransferAuthorization,
    resolveWorkspaceOwnershipTransferAuthorizationStatus,
    revokeWorkspaceOwnershipTransferAuthorization,
    serializeWorkspaceOwnershipTransferAuthorization,
};
