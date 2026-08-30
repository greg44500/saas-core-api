import {
    listWorkspaceAuditLogs,
} from './auditLog.service.js';


const listWorkspaceAuditLogEntries = async (req, res) => {
    const {
        page,
        limit,
        action,
        actorId,
        entityType,
        status,
        from,
        to,
    } = req.validated.query;

    const { auditLogs, pagination } = await listWorkspaceAuditLogs({
        workspaceId: req.workspace._id,
        page,
        limit,
        action: action ?? null,
        actorId: actorId ?? null,
        entityType: entityType ?? null,
        status: status ?? null,
        from: from ?? null,
        to: to ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { auditLogs },
        meta: pagination,
    });
};


export {
    listWorkspaceAuditLogEntries,
};
