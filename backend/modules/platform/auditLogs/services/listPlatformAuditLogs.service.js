import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';
import { AuditLog } from '../../../auditLog/auditLog.model.js';


/**
 * Retourne les AuditLogs visibles depuis l'administration Platform.
 *
 * Contrairement à la lecture tenant, aucun workspace n'est imposé par défaut :
 * le super-admin peut consulter l'historique global ou le restreindre à un
 * workspace précis. Les données techniques sensibles restent volontairement
 * exclues de ce contrat de liste.
 */
const listPlatformAuditLogs = async ({
    page = 1,
    limit = 20,
    workspaceId = null,
    actorId = null,
    action = null,
    entityType = null,
    status = null,
    from = null,
    to = null,
}) => {
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
        workspaceId !== null
        && !mongoose.Types.ObjectId.isValid(workspaceId)
    ) {
        throw new TypeError('workspaceId must be a valid ObjectId');
    }

    if (
        actorId !== null
        && !mongoose.Types.ObjectId.isValid(actorId)
    ) {
        throw new TypeError('actorId must be a valid ObjectId');
    }

    if (action !== null && !Object.values(AUDIT_ACTION).includes(action)) {
        throw new TypeError('action must be a supported audit action');
    }

    if (
        entityType !== null
        && !Object.values(AUDIT_ENTITY_TYPE).includes(entityType)
    ) {
        throw new TypeError(
            'entityType must be a supported audit entity type',
        );
    }

    if (status !== null && !Object.values(AUDIT_STATUS).includes(status)) {
        throw new TypeError('status must be a supported audit status');
    }

    if (
        from !== null
        && (!(from instanceof Date) || Number.isNaN(from.getTime()))
    ) {
        throw new TypeError('from must be a valid Date');
    }

    if (
        to !== null
        && (!(to instanceof Date) || Number.isNaN(to.getTime()))
    ) {
        throw new TypeError('to must be a valid Date');
    }

    if (from !== null && to !== null && from > to) {
        throw new TypeError('from must be earlier than or equal to to');
    }

    const filter = {};

    if (workspaceId !== null) {
        filter.workspace = new mongoose.Types.ObjectId(
            workspaceId.toString(),
        );
    }

    if (actorId !== null) {
        filter.actor = new mongoose.Types.ObjectId(actorId.toString());
    }

    if (action !== null) {
        filter.action = action;
    }

    if (entityType !== null) {
        filter.entityType = entityType;
    }

    if (status !== null) {
        filter.status = status;
    }

    if (from !== null || to !== null) {
        const createdAtFilter = {};

        if (from !== null) {
            createdAtFilter.$gte = from;
        }

        if (to !== null) {
            createdAtFilter.$lte = to;
        }

        filter.createdAt = mongoose.trusted(createdAtFilter);
    }

    const skip = (page - 1) * limit;

    const [auditLogDocuments, total] = await Promise.all([
        AuditLog.find(filter)
            .select(
                '_id actor workspace action '
                + 'entityType entityId status createdAt',
            )
            .populate({
                path: 'actor',
                select: '_id firstName lastName email',
            })
            .populate({
                path: 'workspace',
                select: '_id name',
            })
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        AuditLog.countDocuments(filter),
    ]);

    const auditLogs = auditLogDocuments.map((auditLog) => ({
        id: auditLog._id.toString(),
        actor: auditLog.actor
            ? {
                id: auditLog.actor._id.toString(),
                firstName: auditLog.actor.firstName,
                lastName: auditLog.actor.lastName,
                email: auditLog.actor.email,
            }
            : null,
        workspace: auditLog.workspace
            ? {
                id: auditLog.workspace._id.toString(),
                name: auditLog.workspace.name,
            }
            : null,
        action: auditLog.action,
        status: auditLog.status,
        entity: auditLog.entityType && auditLog.entityId
            ? {
                type: auditLog.entityType,
                id: auditLog.entityId.toString(),
            }
            : null,
        createdAt: auditLog.createdAt,
    }));

    return {
        auditLogs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};


export {
    listPlatformAuditLogs,
};
