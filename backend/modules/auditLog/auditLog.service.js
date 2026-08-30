import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { AuditLog } from './auditLog.model.js';


/**
 * Persiste un événement d’audit immuable.
 *
 * Le service propage volontairement toute erreur de validation ou de
 * persistance. L’appelant doit décider explicitement si l’audit participe à
 * sa transaction ou si son échec peut être traité comme non bloquant.
 *
 * @param {object} auditData
 * @param {mongoose.Types.ObjectId|null} [auditData.actor]
 * @param {mongoose.Types.ObjectId|null} [auditData.workspace]
 * @param {mongoose.Types.ObjectId|null} [auditData.organization]
 * @param {string} auditData.action
 * @param {string|null} [auditData.entityType]
 * @param {mongoose.Types.ObjectId|null} [auditData.entityId]
 * @param {string} auditData.status
 * @param {string|null} [auditData.ipAddress]
 * @param {string|null} [auditData.userAgent]
 * @param {object} [auditData.metadata]
 * @param {object} [options]
 * @param {mongoose.ClientSession|null} [options.session]
 * @returns {Promise<AuditLog>}
 */
async function createAuditLog(
    {
        actor = null,
        workspace = null,
        organization = null,
        action,
        entityType = null,
        entityId = null,
        status,
        ipAddress = null,
        userAgent = null,
        metadata = {},
    },
    {
        session = null,
    } = {},
) {
    /*
     * La sélection explicite des champs empêche un appelant d’imposer des
     * propriétés contrôlées par le système, notamment _id ou createdAt.
     */
    const auditLog = new AuditLog({
        actor,
        workspace,
        organization,
        action,
        entityType,
        entityId,
        status,
        ipAddress,
        userAgent,
        metadata,
    });

    /*
     * Une session fournie rattache l’audit à la transaction métier en cours :
     * l’action sensible et sa trace sont alors validées ou annulées ensemble.
     */
    const saveOptions = session
        ? { session }
        : {};

    return auditLog.save(saveOptions);
}


/**
 * Retourne l’historique d’audit d’un workspace avec pagination et filtres.
 *
 * La portée tenant est imposée par le service lui-même : même si la future
 * couche HTTP charge déjà le contexte workspace, aucune requête AuditLog ne
 * doit pouvoir s’exécuter sans ce filtre explicite.
 *
 * Les données techniques sensibles (IP, user-agent et metadata) ne sont pas
 * exposées par ce contrat de lecture. Leur éventuelle consultation devra faire
 * l’objet d’une politique d’exposition dédiée.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.workspaceId
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string|null} [params.action]
 * @param {string|mongoose.Types.ObjectId|null} [params.actorId]
 * @param {string|null} [params.entityType]
 * @param {string|null} [params.status]
 * @param {Date|null} [params.from]
 * @param {Date|null} [params.to]
 * @returns {Promise<object>}
 */
const listWorkspaceAuditLogs = async ({
    workspaceId,
    page = 1,
    limit = 20,
    action = null,
    actorId = null,
    entityType = null,
    status = null,
    from = null,
    to = null,
}) => {
    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
        throw new TypeError(
            'workspaceId must be a valid ObjectId to list workspace audit logs',
        );
    }

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

    if (action !== null && !Object.values(AUDIT_ACTION).includes(action)) {
        throw new TypeError('action must be a supported audit action');
    }

    if (
        actorId !== null
        && !mongoose.Types.ObjectId.isValid(actorId)
    ) {
        throw new TypeError('actorId must be a valid ObjectId');
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

    if (from !== null && (!(from instanceof Date) || Number.isNaN(from.getTime()))) {
        throw new TypeError('from must be a valid Date');
    }

    if (to !== null && (!(to instanceof Date) || Number.isNaN(to.getTime()))) {
        throw new TypeError('to must be a valid Date');
    }

    if (from !== null && to !== null && from > to) {
        throw new TypeError('from must be earlier than or equal to to');
    }

    const filter = {
        workspace: new mongoose.Types.ObjectId(workspaceId.toString()),
    };

    if (action !== null) {
        filter.action = action;
    }

    if (actorId !== null) {
        filter.actor = new mongoose.Types.ObjectId(actorId.toString());
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

        /*
         * Les opérateurs sont construits exclusivement par le backend à partir
         * de Date déjà validées. trusted() les autorise sans désactiver la
         * protection globale sanitizeFilter pour les données non fiables.
         */
        filter.createdAt = mongoose.trusted(createdAtFilter);
    }

    const skip = (page - 1) * limit;

    const [auditLogDocuments, total] = await Promise.all([
        AuditLog.find(filter)
            .select('_id actor action entityType entityId status createdAt')
            .populate({
                path: 'actor',
                select: '_id firstName lastName email',
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
    createAuditLog,
    listWorkspaceAuditLogs,
};