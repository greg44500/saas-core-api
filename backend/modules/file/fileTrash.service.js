import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { FILE_STATUS } from '../../constants/file.constants.js';
import { storageService } from '../../services/storage/storage.service.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { File } from './file.model.js';

const serializeTrashFile = (file) => ({
    id: file._id.toString(),
    originalName: file.originalName,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    category: file.category,
    status: file.status,
    uploadedBy: file.uploadedBy.toString(),
    deletedBy: file.deletedBy?.toString() ?? null,
    deletedAt: file.deletedAt,
    purgeScheduledAt: file.purgeScheduledAt,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
});

const serializeRestoredFile = (file) => ({
    id: file._id.toString(),
    originalName: file.originalName,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    category: file.category,
    status: file.status,
    uploadedBy: file.uploadedBy.toString(),
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Liste uniquement les fichiers encore restaurables au niveau fonctionnel.
 *
 * Le statut DELETED représente la corbeille. Les fichiers PURGED ne sont plus
 * exposés : leur contenu physique a déjà été détruit et leur quota libéré.
 */
const listWorkspaceTrashFiles = async ({
    workspaceId,
    page = 1,
    limit = 20,
    category,
    search,
}) => {
    const filter = {
        workspace: workspaceId,
        status: FILE_STATUS.DELETED,
        ...(category ? { category } : {}),
        ...(search
            ? {
                originalName: {
                    $regex: escapeRegex(search),
                    $options: 'i',
                },
            }
            : {}),
    };

    const [files, total] = await Promise.all([
        File.find(filter)
            .sort({ deletedAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        File.countDocuments(filter),
    ]);

    return {
        files: files.map(serializeTrashFile),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Restaure un fichier supprimé tant que sa suppression physique n'a pas commencé.
 *
 * Le stockage reste comptabilisé pendant toute la rétention D-019. La
 * restauration ne réserve donc aucun quota supplémentaire et ne modifie jamais
 * UsageMetric. Le compare-and-set final protège la course avec le worker de
 * suppression définitive : un seul des deux peut gagner la transition DELETED.
 */
const restoreWorkspaceFile = async ({
    workspaceId,
    fileId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !fileId || !actorId) {
        throw new TypeError(
            'workspaceId, fileId and actorId are required to restore a file',
        );
    }

    const candidate = await File.findOne({
        _id: fileId,
        workspace: workspaceId,
        status: FILE_STATUS.DELETED,
    })
        .select(
            '+purgeClaimedAt +purgeClaimId +purgeClaimExpiresAt +storageUsageReleasePending',
        )
        .lean();

    /*
     * Le même 404 couvre identifiant inexistant, autre workspace, fichier actif
     * et fichier déjà supprimé définitivement afin de ne révéler aucune
     * ressource hors corbeille.
     */
    if (!candidate) {
        throw new AppError('Fichier introuvable dans la corbeille', 404);
    }

    if (
        candidate.purgeClaimedAt != null
        || candidate.purgeClaimId != null
        || candidate.purgeClaimExpiresAt != null
    ) {
        throw new AppError(
            'La restauration est impossible car la suppression définitive du fichier a commencé',
            409,
        );
    }

    const physicallyAvailable = await storageService.fileExists({
        provider: candidate.storageProvider,
        storageKey: candidate.storageKey,
    });

    if (!physicallyAvailable) {
        throw new AppError(
            'La restauration est impossible car le contenu du fichier n’est plus disponible',
            409,
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const restoredFile = await File.findOneAndUpdate(
            {
                _id: fileId,
                workspace: workspaceId,
                status: FILE_STATUS.DELETED,
                purgeClaimedAt: null,
                purgeClaimId: null,
                purgeClaimExpiresAt: null,
            },
            {
                $set: {
                    status: FILE_STATUS.ACTIVE,
                    deletedAt: null,
                    deletedBy: null,
                    purgeScheduledAt: null,
                    purgeClaimedAt: null,
                    purgeClaimId: null,
                    purgeClaimExpiresAt: null,
                    storageUsageReleasePending: false,
                    purgedAt: null,
                    updatedBy: actorId,
                },
            },
            {
                new: true,
                runValidators: true,
                session,
            },
        );

        if (!restoredFile) {
            throw new AppError(
                'La restauration est impossible car l’état du fichier a changé',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.FILE_RESTORED,
                entityType: AUDIT_ENTITY_TYPE.FILE,
                entityId: restoredFile._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    sizeBytes: restoredFile.sizeBytes,
                    deletedAt: candidate.deletedAt,
                    purgeScheduledAt: candidate.purgeScheduledAt,
                },
            },
            { session },
        );

        return serializeRestoredFile(restoredFile);
    });
};

export {
    listWorkspaceTrashFiles,
    restoreWorkspaceFile,
};
