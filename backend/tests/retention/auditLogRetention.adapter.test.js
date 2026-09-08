import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    countDocumentsMock,
    deleteManyMock,
    findMock,
} = vi.hoisted(() => ({
    countDocumentsMock: vi.fn(),
    deleteManyMock: vi.fn(),
    findMock: vi.fn(),
}));

vi.mock('../../modules/auditLog/auditLog.model.js', () => ({
    AuditLog: {
        collection: {
            countDocuments: countDocumentsMock,
            deleteMany: deleteManyMock,
            find: findMock,
        },
    },
}));

import {
    auditLogRetentionAdapter,
} from '../../modules/retention/adapters/auditLogRetention.adapter.js';

const createCursor = (documents) => ({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(documents),
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('auditLogRetentionAdapter', () => {
    it('prévisualise uniquement depuis le cutoff serveur', async () => {
        const cutoffAt = new Date('2026-01-01T00:00:00.000Z');
        countDocumentsMock.mockResolvedValue(42);

        await expect(
            auditLogRetentionAdapter.preview({ cutoffAt }),
        ).resolves.toEqual({
            eligibleCount: 42,
        });

        expect(countDocumentsMock).toHaveBeenCalledWith({
            createdAt: {
                $lte: cutoffAt,
            },
        });
    });

    it('supprime seulement les ids sélectionnés sous le même cutoff', async () => {
        const cutoffAt = new Date('2026-01-01T00:00:00.000Z');
        const documents = [
            { _id: 'audit-1', createdAt: new Date('2025-01-01') },
            { _id: 'audit-2', createdAt: new Date('2025-01-02') },
        ];
        const cursor = createCursor(documents);

        findMock.mockReturnValue(cursor);
        deleteManyMock.mockResolvedValue({
            deletedCount: 1,
        });

        const result = await auditLogRetentionAdapter.executeBatch({
            cutoffAt,
            batchSize: 25,
        });

        expect(findMock).toHaveBeenCalledWith(
            {
                createdAt: {
                    $lte: cutoffAt,
                },
            },
            {
                projection: {
                    _id: 1,
                    createdAt: 1,
                },
            },
        );
        expect(cursor.sort).toHaveBeenCalledWith({
            createdAt: 1,
            _id: 1,
        });
        expect(cursor.limit).toHaveBeenCalledWith(25);
        expect(deleteManyMock).toHaveBeenCalledWith({
            _id: {
                $in: ['audit-1', 'audit-2'],
            },
            createdAt: {
                $lte: cutoffAt,
            },
        });
        expect(result).toEqual({
            selected: 2,
            processed: 2,
            affected: 1,
            skipped: 1,
            failed: 0,
        });
    });

    it('n’exécute aucun delete lorsqu’aucun AuditLog n’est éligible', async () => {
        findMock.mockReturnValue(createCursor([]));

        await expect(
            auditLogRetentionAdapter.executeBatch({
                cutoffAt: new Date('2026-01-01T00:00:00.000Z'),
                batchSize: 100,
            }),
        ).resolves.toEqual({
            selected: 0,
            processed: 0,
            affected: 0,
            skipped: 0,
            failed: 0,
        });

        expect(deleteManyMock).not.toHaveBeenCalled();
    });
});
