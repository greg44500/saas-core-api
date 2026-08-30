import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { FILE_STATUS } from '../../constants/file.constants.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { storageService } from '../../services/storage/storage.service.js';
import { File } from './file.model.js';

const DEFAULT_PURGE_BATCH_SIZE = 100;
const MAX_PURGE_BATCH_SIZE = 500;

const assertValidNow = (now) => {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('now must be a valid Date');
    }
};

const assertValidBatchSize = (batchSize) => {
    if (!Number.isInteger(batchSize) || batchSize <= 0 || batchSize > MAX_PURGE_BATCH_SIZE) {
        throw new TypeError(
            `batchSize must be an integer between 1 and ${MAX_PURGE_BATCH_SIZE}`,
        );
    }
};

const finalizePurgedFile = async ({ fileId, now }) =>
    mongoose.connection.transaction(async (session) => {
        let query = File.findOne({
            _id: fileId,
            status: FILE_STATUS.DELETED,
            purgeScheduledAt: mongoose.trusted({ $lte: now }),
        });
        query = query.session(session);
        const file = await query;
        if (!file) return null;

        file.status = FILE_STATUS.PURGED;
        file.purgedAt = now;
        file.updatedBy = null;
        await file.save({ session });

        await createAuditLog({
            actor: null,
            workspace: file.workspace,
            action: AUDIT_ACTION.FILE_PURGED,
            entityType: AUDIT_ENTITY_TYPE.FILE,
            entityId: file._id,
            status: AUDIT_STATUS.SUCCESS,
            metadata: { purgeScheduledAt: file.purgeScheduledAt },
        }, { session });

        return file;
    });

/**
 * Purge un lot borné de fichiers arrivés au terme de leur rétention.
 *
 * La suppression provider est idempotente et précède la transition MongoDB :
 * un retry peut donc reprendre après une panne entre les deux systèmes. Le
 * résultat expose hasMore pour permettre à l'exploitation de détecter un lot
 * plein et de relancer jusqu'à épuisement du backlog.
 */
const purgeDeletedFiles = async ({
    now = new Date(),
    batchSize = DEFAULT_PURGE_BATCH_SIZE,
} = {}) => {
    assertValidNow(now);
    assertValidBatchSize(batchSize);

    const candidates = await File.find({
        status: FILE_STATUS.DELETED,
        purgeScheduledAt: mongoose.trusted({ $lte: now }),
    })
        .select('_id workspace storageProvider storageKey purgeScheduledAt')
        .sort({ purgeScheduledAt: 1, _id: 1 })
        .limit(batchSize)
        .lean();

    let purged = 0;
    let skipped = 0;

    for (const candidate of candidates) {
        await storageService.deleteFile({
            provider: candidate.storageProvider,
            storageKey: candidate.storageKey,
        });

        const finalized = await finalizePurgedFile({ fileId: candidate._id, now });
        if (finalized) purged += 1;
        else skipped += 1;
    }

    return {
        selected: candidates.length,
        purged,
        skipped,
        hasMore: candidates.length === batchSize,
    };
};

export {
    DEFAULT_PURGE_BATCH_SIZE,
    MAX_PURGE_BATCH_SIZE,
    finalizePurgedFile,
    purgeDeletedFiles,
};
