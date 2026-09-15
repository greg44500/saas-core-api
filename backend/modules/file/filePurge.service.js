import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { FILE_STATUS } from '../../constants/file.constants.js';
import { storageService } from '../../services/storage/storage.service.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    releaseCurrentUsageMetric,
} from '../usageMetric/releaseUsageMetric.service.js';
import { File } from './file.model.js';

const DEFAULT_PURGE_BATCH_SIZE = 100;
const MAX_PURGE_BATCH_SIZE = 500;

/*
 * La lease couvre une seule suppression provider suivie de sa finalisation
 * transactionnelle. Elle évite un verrou permanent après crash tout en
 * laissant largement le temps à une opération de stockage ordinaire.
 */
const PURGE_CLAIM_LEASE_MS = 5 * 60 * 1000;

const assertValidNow = (now) => {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('now must be a valid Date');
    }
};

const assertValidBatchSize = (batchSize) => {
    if (
        !Number.isInteger(batchSize)
        || batchSize <= 0
        || batchSize > MAX_PURGE_BATCH_SIZE
    ) {
        throw new TypeError(
            `batchSize must be an integer between 1 and ${MAX_PURGE_BATCH_SIZE}`,
        );
    }
};

const buildDuePurgeFilter = ({
    now,
    fileId = undefined,
    workspaceId = undefined,
}) => ({
    ...(fileId === undefined ? {} : { _id: fileId }),
    ...(workspaceId === undefined ? {} : { workspace: workspaceId }),
    status: FILE_STATUS.DELETED,
    purgeScheduledAt: mongoose.trusted({
        $lte: now,
    }),
});

/**
 * Réclame atomiquement un candidat avant toute suppression physique.
 *
 * Le jeton de claim constitue un compare-and-set : deux workers peuvent avoir
 * lu le même candidat, mais un seul détient une lease active. Une lease expirée
 * peut être reprise après crash. purgeClaimedAt reste non nul pendant toute la
 * phase destructive afin qu'une restauration concurrente soit refusée dès que
 * la suppression définitive a réellement commencé.
 */
const claimPurgeCandidate = async ({
    fileId,
    now,
    workspaceId = undefined,
    actorId = null,
}) => {
    const claimId = randomUUID();
    const claimExpiresAt = new Date(
        now.getTime() + PURGE_CLAIM_LEASE_MS,
    );

    const update = {
        $set: {
            purgeClaimedAt: now,
            purgeClaimId: claimId,
            purgeClaimExpiresAt: claimExpiresAt,
            updatedBy: actorId,
        },
    };

    const options = {
        returnDocument: 'after',
        runValidators: true,
    };

    const selectClaimedFile = (extraFilter) =>
        File.findOneAndUpdate(
            {
                ...buildDuePurgeFilter({
                    fileId,
                    now,
                    workspaceId,
                }),
                ...extraFilter,
            },
            update,
            options,
        )
            .select([
                '_id',
                'workspace',
                'sizeBytes',
                'storageProvider',
                'storageKey',
                'purgeScheduledAt',
                '+purgeClaimedAt',
                '+purgeClaimId',
                '+purgeClaimExpiresAt',
                '+storageUsageReleasePending',
            ].join(' '))
            .lean();

    /*
     * Le premier compare-and-set cible uniquement un document jamais réclamé.
     * Les trois null couvrent aussi les documents historiques où ces champs
     * n'existent pas encore.
     */
    let claimedFile = await selectClaimedFile({
        purgeClaimedAt: null,
        purgeClaimId: null,
        purgeClaimExpiresAt: null,
    });

    if (!claimedFile) {
        /*
         * Un claim existant n'est repris qu'après son échéance technique.
         * Le $lte est construit par le backend et explicitement trusted.
         */
        claimedFile = await selectClaimedFile({
            purgeClaimExpiresAt: mongoose.trusted({
                $lte: now,
            }),
        });
    }

    if (!claimedFile) {
        return null;
    }

    return {
        claimId,
        file: claimedFile,
    };
};

/**
 * Finalise la suppression physique uniquement si le demandeur détient toujours
 * le claim courant.
 *
 * La décrémentation de storage_bytes, la transition PURGED et l'AuditLog sont
 * dans la même transaction MongoDB. Si la transaction échoue après la
 * suppression provider, un retry pourra supprimer idempotemment un contenu
 * déjà absent puis retenter cette transaction sans décrémenter deux fois.
 */
const finalizePurgedFile = async ({
    fileId,
    claimId,
    now,
    workspaceId = undefined,
    actorId = null,
    auditAction = AUDIT_ACTION.FILE_PURGED,
    ipAddress = null,
    userAgent = null,
}) =>
    mongoose.connection.transaction(async (session) => {
        let query = File.findOne({
            _id: fileId,
            ...(workspaceId === undefined ? {} : { workspace: workspaceId }),
            status: FILE_STATUS.DELETED,
            purgeScheduledAt: mongoose.trusted({
                $lte: now,
            }),
            purgeClaimId: claimId,
        });
        query = query
            .select(
                '+purgeClaimedAt +purgeClaimId +purgeClaimExpiresAt +storageUsageReleasePending',
            )
            .session(session);

        const file = await query;
        if (!file) return null;

        if (file.storageUsageReleasePending === true) {
            await releaseCurrentUsageMetric({
                workspaceId: file.workspace,
                metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
                amount: file.sizeBytes,
                actorId,
                session,
            });
        }

        file.status = FILE_STATUS.PURGED;
        file.purgedAt = now;
        file.purgeClaimedAt = null;
        file.purgeClaimId = null;
        file.purgeClaimExpiresAt = null;
        file.storageUsageReleasePending = false;
        file.updatedBy = actorId;

        await file.save({ session });

        await createAuditLog(
            {
                actor: actorId,
                workspace: file.workspace,
                action: auditAction,
                entityType: AUDIT_ENTITY_TYPE.FILE,
                entityId: file._id,
                status: AUDIT_STATUS.SUCCESS,
                ...(ipAddress === null ? {} : { ipAddress }),
                ...(userAgent === null ? {} : { userAgent }),
                metadata: {
                    sizeBytes: file.sizeBytes,
                    purgeScheduledAt: file.purgeScheduledAt,
                },
            },
            { session },
        );

        return file;
    });

/**
 * Supprime définitivement un lot borné de fichiers arrivés au terme de leur
 * rétention.
 *
 * La lecture initiale ne constitue jamais l'autorité destructive : chaque
 * candidat doit être réclamé atomiquement juste avant l'appel provider. Le
 * provider reste idempotent ; la finalisation MongoDB n'est possible que pour
 * le détenteur du claim courant. L'échéance du claim autorise uniquement sa
 * reprise ; un worker peut encore finaliser tant que son jeton n'a pas été
 * remplacé, ce qui évite de transformer une lenteur provider en échec artificiel.
 */
const purgeDeletedFiles = async ({
    now = new Date(),
    batchSize = DEFAULT_PURGE_BATCH_SIZE,
} = {}) => {
    assertValidNow(now);
    assertValidBatchSize(batchSize);

    const candidates = await File.find(
        buildDuePurgeFilter({ now }),
    )
        .select('_id')
        .sort({
            purgeScheduledAt: 1,
            _id: 1,
        })
        .limit(batchSize)
        .lean();

    let claimed = 0;
    let purged = 0;
    let skipped = 0;

    for (const candidate of candidates) {
        const claim = await claimPurgeCandidate({
            fileId: candidate._id,
            now,
        });

        if (!claim) {
            skipped += 1;
            continue;
        }

        claimed += 1;

        await storageService.deleteFile({
            provider: claim.file.storageProvider,
            storageKey: claim.file.storageKey,
        });

        const finalized = await finalizePurgedFile({
            fileId: claim.file._id,
            claimId: claim.claimId,
            now,
        });

        if (finalized) {
            purged += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        selected: candidates.length,
        claimed,
        purged,
        skipped,
        hasMore: candidates.length === batchSize,
    };
};

export {
    DEFAULT_PURGE_BATCH_SIZE,
    MAX_PURGE_BATCH_SIZE,
    PURGE_CLAIM_LEASE_MS,
    claimPurgeCandidate,
    finalizePurgedFile,
    purgeDeletedFiles,
};
