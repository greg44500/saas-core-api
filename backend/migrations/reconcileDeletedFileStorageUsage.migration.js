import mongoose from 'mongoose';

import { FILE_STATUS } from '../constants/file.constants.js';
import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../constants/usageMetric.constants.js';
import { File } from '../modules/file/file.model.js';
import {
    CORE_PLAN_METRIC,
} from '../modules/plan/planCapability.registry.js';
import {
    UsageMetric,
} from '../modules/usageMetric/usageMetric.model.js';

/**
 * Réconcilie les fichiers DELETED créés avec l'ancien modèle de quota.
 *
 * Avant D-019.4, deleteWorkspaceFile() décrémentait storage_bytes dès le
 * soft-delete. Le nouveau contrat conserve ces octets jusqu'à la purge
 * physique. Pour chaque ancien fichier encore en corbeille, la migration
 * réajoute donc sa taille au compteur courant et positionne atomiquement le
 * marqueur storageUsageReleasePending.
 *
 * Le marqueur rend la migration forward-only et idempotente : un fichier déjà
 * réconcilié ne peut pas être ajouté une seconde fois, même après un retry.
 */
const reconcileDeletedFileStorageUsage = async () => {
    let reconciled = 0;

    while (true) {
        const fileId = await mongoose.connection.transaction(
            async (session) => {
                const file = await File.findOneAndUpdate(
                    {
                        status: FILE_STATUS.DELETED,
                        storageUsageReleasePending: mongoose.trusted({
                            $ne: true,
                        }),
                    },
                    {
                        $set: {
                            storageUsageReleasePending: true,
                            updatedBy: null,
                        },
                    },
                    {
                        sort: {
                            purgeScheduledAt: 1,
                            _id: 1,
                        },
                        returnDocument: 'before',
                        runValidators: true,
                        session,
                    },
                )
                    .select(
                        '_id workspace sizeBytes +storageUsageReleasePending',
                    )
                    .lean();

                if (!file) {
                    return null;
                }

                const usageMetric = await UsageMetric.findOneAndUpdate(
                    {
                        workspace: file.workspace,
                        metricKey:
                            CORE_PLAN_METRIC.STORAGE_BYTES,
                        periodType:
                            USAGE_METRIC_PERIOD_TYPE.CURRENT,
                        periodStart: null,
                    },
                    {
                        $inc: {
                            value: file.sizeBytes,
                        },
                        $set: {
                            updatedBy: null,
                        },
                        $setOnInsert: {
                            createdBy: null,
                            periodEnd: null,
                        },
                    },
                    {
                        upsert: true,
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

                if (!usageMetric) {
                    throw new Error(
                        'Storage usage metric reconciliation failed',
                    );
                }

                return file._id;
            },
        );

        if (!fileId) {
            break;
        }

        reconciled += 1;
    }

    return {
        reconciled,
    };
};

export { reconcileDeletedFileStorageUsage };
