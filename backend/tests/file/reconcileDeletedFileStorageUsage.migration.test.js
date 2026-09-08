import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    fileFindOneAndUpdateMock,
    transactionMock,
    usageMetricFindOneAndUpdateMock,
} = vi.hoisted(() => ({
    fileFindOneAndUpdateMock: vi.fn(),
    transactionMock: vi.fn(
        async (callback) => callback({ id: 'session' }),
    ),
    usageMetricFindOneAndUpdateMock: vi.fn(),
}));

vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: transactionMock,
        },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/file/file.model.js', () => ({
    File: {
        findOneAndUpdate: fileFindOneAndUpdateMock,
    },
}));

vi.mock('../../modules/usageMetric/usageMetric.model.js', () => ({
    UsageMetric: {
        findOneAndUpdate:
            usageMetricFindOneAndUpdateMock,
    },
}));

import {
    reconcileDeletedFileStorageUsage,
} from '../../migrations/reconcileDeletedFileStorageUsage.migration.js';
import {
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';
import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

const createFileQuery = (result) => ({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
});

beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(
        async (callback) => callback({ id: 'session' }),
    );
});

describe('reconcileDeletedFileStorageUsage', () => {
    it('réajoute exactement une fois le stockage d’un ancien fichier DELETED', async () => {
        const legacyDeletedFile = {
            _id: 'file-id',
            workspace: 'workspace-id',
            sizeBytes: 4_096,
        };

        fileFindOneAndUpdateMock
            .mockReturnValueOnce(
                createFileQuery(legacyDeletedFile),
            )
            .mockReturnValueOnce(
                createFileQuery(null),
            );

        usageMetricFindOneAndUpdateMock
            .mockResolvedValue({
                value: 8_192,
            });

        const result =
            await reconcileDeletedFileStorageUsage();

        const [
            fileFilter,
            fileUpdate,
            fileOptions,
        ] = fileFindOneAndUpdateMock.mock.calls[0];

        expect(fileFilter).toEqual({
            status: 'deleted',
            storageUsageReleasePending: {
                $ne: true,
            },
        });
        expect(fileUpdate).toEqual({
            $set: {
                storageUsageReleasePending: true,
                updatedBy: null,
            },
        });
        expect(fileOptions).toMatchObject({
            returnDocument: 'before',
            runValidators: true,
            session: {
                id: 'session',
            },
        });

        expect(
            usageMetricFindOneAndUpdateMock,
        ).toHaveBeenCalledWith(
            {
                workspace: legacyDeletedFile.workspace,
                metricKey:
                    CORE_PLAN_METRIC.STORAGE_BYTES,
                periodType:
                    USAGE_METRIC_PERIOD_TYPE.CURRENT,
                periodStart: null,
            },
            {
                $inc: {
                    value: legacyDeletedFile.sizeBytes,
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
                session: {
                    id: 'session',
                },
            },
        );

        expect(result).toEqual({
            reconciled: 1,
        });
    });

    it('ne modifie aucune métrique lorsqu’aucun ancien DELETED n’est présent', async () => {
        fileFindOneAndUpdateMock.mockReturnValue(
            createFileQuery(null),
        );

        const result =
            await reconcileDeletedFileStorageUsage();

        expect(
            usageMetricFindOneAndUpdateMock,
        ).not.toHaveBeenCalled();
        expect(result).toEqual({
            reconciled: 0,
        });
    });

    it('échoue si la métrique storage_bytes ne peut pas être réconciliée', async () => {
        fileFindOneAndUpdateMock.mockReturnValue(
            createFileQuery({
                _id: 'file-id',
                workspace: 'workspace-id',
                sizeBytes: 1_024,
            }),
        );
        usageMetricFindOneAndUpdateMock
            .mockResolvedValue(null);

        await expect(
            reconcileDeletedFileStorageUsage(),
        ).rejects.toThrow(
            'Storage usage metric reconciliation failed',
        );
    });
});
