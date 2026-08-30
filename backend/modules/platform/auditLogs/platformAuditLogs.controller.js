import {
    listPlatformAuditLogs,
} from './services/listPlatformAuditLogs.service.js';


/**
 * Retourne la liste globale des AuditLogs accessibles au super-admin.
 *
 * La validation HTTP a déjà normalisé pagination, identifiants et dates.
 * Le contrôleur reste donc limité à l'orchestration du contrat HTTP.
 */
const listAuditLogs = async (req, res) => {
    const {
        page,
        limit,
        workspaceId,
        actorId,
        action,
        entityType,
        status,
        from,
        to,
    } = req.validated.query;

    const {
        auditLogs,
        pagination,
    } = await listPlatformAuditLogs({
        page,
        limit,
        workspaceId: workspaceId ?? null,
        actorId: actorId ?? null,
        action: action ?? null,
        entityType: entityType ?? null,
        status: status ?? null,
        from: from ?? null,
        to: to ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: {
            auditLogs,
        },
        meta: pagination,
    });
};


export {
    listAuditLogs,
};
