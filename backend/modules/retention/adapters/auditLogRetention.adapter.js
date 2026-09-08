import { AuditLog } from '../../auditLog/auditLog.model.js';
import { RETENTION_TARGET } from '../retentionTarget.registry.js';

const assertValidCutoff = (cutoffAt) => {
    if (
        !(cutoffAt instanceof Date)
        || Number.isNaN(cutoffAt.getTime())
    ) {
        throw new TypeError('cutoffAt must be a valid Date');
    }
};

const assertValidBatchSize = (batchSize) => {
    if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
        throw new TypeError('batchSize must be a positive safe integer');
    }
};

const buildEligibilityFilter = (cutoffAt) => ({
    createdAt: {
        $lte: cutoffAt,
    },
});

/**
 * Preview sans contenu métier : seul le volume éligible est retourné.
 */
const preview = async ({ cutoffAt }) => {
    assertValidCutoff(cutoffAt);

    const eligibleCount = await AuditLog.collection.countDocuments(
        buildEligibilityFilter(cutoffAt),
    );

    return { eligibleCount };
};

/**
 * Chemin technique étroit de purge des AuditLogs.
 *
 * Le modèle AuditLog interdit volontairement deleteMany(). Ici, le moteur
 * utilise la collection native uniquement avec un filtre construit par le
 * backend : cutoff serveur + liste d'identifiants sélectionnés dans le même
 * lot. Aucun filtre libre ni contenu de log ne traverse ce contrat.
 */
const executeBatch = async ({ cutoffAt, batchSize }) => {
    assertValidCutoff(cutoffAt);
    assertValidBatchSize(batchSize);

    const documents = await AuditLog.collection
        .find(
            buildEligibilityFilter(cutoffAt),
            {
                projection: {
                    _id: 1,
                    createdAt: 1,
                },
            },
        )
        .sort({
            createdAt: 1,
            _id: 1,
        })
        .limit(batchSize)
        .toArray();

    if (documents.length === 0) {
        return {
            selected: 0,
            processed: 0,
            affected: 0,
            skipped: 0,
            failed: 0,
        };
    }

    const selectedIds = documents.map(({ _id }) => _id);
    const deletion = await AuditLog.collection.deleteMany({
        _id: {
            $in: selectedIds,
        },
        ...buildEligibilityFilter(cutoffAt),
    });

    const affected = deletion.deletedCount ?? 0;
    const skipped = documents.length - affected;

    return {
        selected: documents.length,
        processed: documents.length,
        affected,
        skipped,
        failed: 0,
    };
};

const auditLogRetentionAdapter = Object.freeze({
    targetKey: RETENTION_TARGET.AUDIT_LOG,
    preview,
    executeBatch,
});

export { auditLogRetentionAdapter };
