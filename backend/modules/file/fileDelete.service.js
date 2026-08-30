import mongoose from 'mongoose';

import {
    FILE_RETENTION_DAYS,
    FILE_STATUS,
} from '../../constants/file.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    releaseCurrentUsageMetric,
} from '../usageMetric/releaseUsageMetric.service.js';
import { File } from './file.model.js';

const addRetentionDays = (date) => {
    const purgeScheduledAt = new Date(date);
    purgeScheduledAt.setUTCDate(
        purgeScheduledAt.getUTCDate() + FILE_RETENTION_DAYS,
    );
    return purgeScheduledAt;
};

/**
 * Supprime logiquement un fichier actif sans toucher immédiatement au contenu
 * physique. Le quota fonctionnel est libéré dès la suppression logique afin
 * que cette action puisse réellement servir de remédiation.
 */
const deleteWorkspaceFile = async ({
    workspaceId,
    fileId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !fileId || !actorId) {
        throw new TypeError(
            'workspaceId, fileId and actorId are required to delete a file',
        );
    }

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('now must be a valid Date');
    }

    return mongoose.connection.transaction(async (session) => {
        let query = File.findOne({
            _id: fileId,
            workspace: workspaceId,
            status: FILE_STATUS.ACTIVE,
        });
        query = query.session(session);

        const file = await query;

        /*
         * Le même 404 couvre un identifiant inexistant, un autre workspace et
         * un fichier déjà supprimé. L'API ne révèle ainsi aucune ressource hors
         * de la frontière active du tenant courant.
         */
        if (!file) {
            throw new AppError('Fichier introuvable', 404);
        }

        file.status = FILE_STATUS.DELETED;
        file.deletedAt = now;
        file.deletedBy = actorId;
        file.purgeScheduledAt = addRetentionDays(now);
        file.purgedAt = null;
        file.updatedBy = actorId;

        await file.save({ session });

        await releaseCurrentUsageMetric({
            workspaceId,
            metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
            amount: file.sizeBytes,
            actorId,
            session,
        });

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.FILE_DELETED,
                entityType: AUDIT_ENTITY_TYPE.FILE,
                entityId: file._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    sizeBytes: file.sizeBytes,
                    purgeScheduledAt: file.purgeScheduledAt,
                },
            },
            { session },
        );

        return file;
    });
};

export { deleteWorkspaceFile };
