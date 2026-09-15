import {
    AUDIT_ACTION,
} from '../../constants/auditActions.constants.js';
import { FILE_STATUS } from '../../constants/file.constants.js';
import { storageService } from '../../services/storage/storage.service.js';
import { AppError } from '../../utils/appError.js';
import { File } from './file.model.js';
import {
    claimPurgeCandidate,
    finalizePurgedFile,
} from './filePurge.service.js';

/**
 * Supprime immédiatement et définitivement un fichier déjà placé en Corbeille.
 *
 * Le service ne duplique pas le moteur destructif du job planifié : il avance
 * d'abord l'échéance de suppression définitive, puis réutilise le même claim
 * atomique, la même suppression provider et la même finalisation transactionnelle.
 * Une restauration concurrente ne peut donc pas gagner après l'acquisition du
 * claim, et le quota storage_bytes n'est libéré qu'une seule fois.
 */
const permanentlyDeleteWorkspaceFile = async ({
    workspaceId,
    fileId,
    actorId,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
}) => {
    if (!workspaceId || !fileId || !actorId) {
        throw new TypeError(
            'workspaceId, fileId and actorId are required to permanently delete a file',
        );
    }

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('now must be a valid Date');
    }

    const candidate = await File.findOne({
        _id: fileId,
        workspace: workspaceId,
        status: FILE_STATUS.DELETED,
    })
        .select(
            'deletedAt purgeScheduledAt +purgeClaimedAt +purgeClaimId +purgeClaimExpiresAt',
        )
        .lean();

    if (!candidate) {
        throw new AppError('Fichier introuvable dans la corbeille', 404);
    }

    const hasActiveClaim = candidate.purgeClaimId != null
        && candidate.purgeClaimExpiresAt instanceof Date
        && candidate.purgeClaimExpiresAt > now;

    if (hasActiveClaim) {
        throw new AppError(
            'La suppression définitive de ce fichier est déjà en cours',
            409,
        );
    }

    /*
     * Le modèle impose une échéance strictement postérieure au soft-delete.
     * Lors d'une demande immédiate effectuée dans la même milliseconde, on
     * décale donc techniquement l'instant d'une milliseconde sans créer de délai
     * visible pour l'utilisateur.
     */
    const deletedAtMs = candidate.deletedAt instanceof Date
        ? candidate.deletedAt.getTime()
        : now.getTime() - 1;
    const operationAt = new Date(
        Math.max(now.getTime(), deletedAtMs + 1),
    );

    const accelerated = await File.findOneAndUpdate(
        {
            _id: fileId,
            workspace: workspaceId,
            status: FILE_STATUS.DELETED,
            purgeScheduledAt: candidate.purgeScheduledAt,
            purgeClaimId: candidate.purgeClaimId ?? null,
            purgeClaimExpiresAt: candidate.purgeClaimExpiresAt ?? null,
        },
        {
            $set: {
                purgeScheduledAt: operationAt,
                updatedBy: actorId,
            },
        },
        {
            new: true,
            runValidators: true,
        },
    )
        .select('_id')
        .lean();

    if (!accelerated) {
        throw new AppError(
            'La suppression définitive est impossible car l’état du fichier a changé',
            409,
        );
    }

    const claim = await claimPurgeCandidate({
        fileId,
        workspaceId,
        now: operationAt,
        actorId,
    });

    if (!claim) {
        throw new AppError(
            'La suppression définitive est déjà en cours ou l’état du fichier a changé',
            409,
        );
    }

    await storageService.deleteFile({
        provider: claim.file.storageProvider,
        storageKey: claim.file.storageKey,
    });

    const finalized = await finalizePurgedFile({
        fileId,
        claimId: claim.claimId,
        now: operationAt,
        workspaceId,
        actorId,
        auditAction: AUDIT_ACTION.FILE_PERMANENTLY_DELETED,
        ipAddress,
        userAgent,
    });

    if (!finalized) {
        throw new AppError(
            'La suppression définitive n’a pas pu être finalisée',
            409,
        );
    }
};

export { permanentlyDeleteWorkspaceFile };
