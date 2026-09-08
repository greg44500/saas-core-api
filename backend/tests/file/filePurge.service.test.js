import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    createAuditLogMock,
    deleteFileMock,
    findMock,
    findOneAndUpdateMock,
    findOneMock,
    releaseCurrentUsageMetricMock,
    transactionMock,
} = vi.hoisted(() => ({
    createAuditLogMock: vi.fn(),
    deleteFileMock: vi.fn(),
    findMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(),
    findOneMock: vi.fn(),
    releaseCurrentUsageMetricMock: vi.fn(),
    transactionMock: vi.fn(
        async (callback) => callback({ id: 'session' }),
    ),
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
        find: findMock,
        findOne: findOneMock,
        findOneAndUpdate: findOneAndUpdateMock,
    },
}));

vi.mock('../../services/storage/storage.service.js', () => ({
    storageService: {
        deleteFile: deleteFileMock,
    },
}));

vi.mock('../../modules/usageMetric/releaseUsageMetric.service.js', () => ({
    releaseCurrentUsageMetric:
        releaseCurrentUsageMetricMock,
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: createAuditLogMock,
}));

import {
    PURGE_CLAIM_LEASE_MS,
    purgeDeletedFiles,
} from '../../modules/file/filePurge.service.js';
import {
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';

const createFindChain = (candidates) => ({
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(candidates),
});

const createLeanQuery = (result) => ({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
});

const createFinalizeQuery = (result) => ({
    select: vi.fn().mockReturnThis(),
    session: vi.fn().mockResolvedValue(result),
});

const createCandidate = (overrides = {}) => ({
    _id: 'file-id',
    workspace: 'workspace-id',
    sizeBytes: 2_048,
    storageProvider: 'local',
    storageKey: 'workspaces/workspace-id/file.pdf',
    purgeScheduledAt:
        new Date('2026-09-30T10:00:00.000Z'),
    ...overrides,
});

const createFileDocument = (overrides = {}) => ({
    ...createCandidate(),
    status: 'deleted',
    purgeClaimedAt:
        new Date('2026-09-30T12:00:00.000Z'),
    purgeClaimId: 'claim-loaded-from-db',
    purgeClaimExpiresAt:
        new Date('2026-09-30T12:05:00.000Z'),
    storageUsageReleasePending: true,
    purgedAt: null,
    updatedBy: 'previous-actor',
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();

    transactionMock.mockImplementation(
        async (callback) => callback({ id: 'session' }),
    );
});

describe('purgeDeletedFiles', () => {
    it('réclame le fichier avant le provider puis libère le quota dans la finalisation transactionnelle', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');
        const candidate = createCandidate();
        const fileDocument = createFileDocument();

        findMock.mockReturnValue(
            createFindChain([candidate]),
        );
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery(candidate),
        );
        findOneMock.mockReturnValue(
            createFinalizeQuery(fileDocument),
        );
        deleteFileMock.mockResolvedValue({
            deleted: true,
        });
        releaseCurrentUsageMetricMock
            .mockResolvedValue({});
        createAuditLogMock.mockResolvedValue({});

        const result = await purgeDeletedFiles({
            now,
            batchSize: 25,
        });

        const [
            claimFilter,
            claimUpdate,
        ] = findOneAndUpdateMock.mock.calls[0];

        expect(claimFilter).toEqual({
            _id: candidate._id,
            status: 'deleted',
            purgeScheduledAt: {
                $lte: now,
            },
            purgeClaimedAt: null,
            purgeClaimId: null,
            purgeClaimExpiresAt: null,
        });

        expect(
            claimUpdate.$set.purgeClaimId,
        ).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        expect(
            claimUpdate.$set.purgeClaimExpiresAt,
        ).toEqual(
            new Date(
                now.getTime()
                + PURGE_CLAIM_LEASE_MS,
            ),
        );

        expect(deleteFileMock).toHaveBeenCalledWith({
            provider: candidate.storageProvider,
            storageKey: candidate.storageKey,
        });

        const finalizationFilter =
            findOneMock.mock.calls[0][0];

        expect(finalizationFilter.purgeClaimId)
            .toBe(claimUpdate.$set.purgeClaimId);

        expect(releaseCurrentUsageMetricMock)
            .toHaveBeenCalledWith({
                workspaceId: fileDocument.workspace,
                metricKey:
                    CORE_PLAN_METRIC.STORAGE_BYTES,
                amount: fileDocument.sizeBytes,
                actorId: null,
                session: {
                    id: 'session',
                },
            });

        expect(fileDocument.status).toBe('purged');
        expect(fileDocument.purgedAt).toBe(now);
        expect(fileDocument.purgeClaimedAt).toBeNull();
        expect(fileDocument.purgeClaimId).toBeNull();
        expect(fileDocument.purgeClaimExpiresAt).toBeNull();
        expect(
            fileDocument.storageUsageReleasePending,
        ).toBe(false);
        expect(fileDocument.updatedBy).toBeNull();

        expect(createAuditLogMock)
            .toHaveBeenCalledWith(
                expect.objectContaining({
                    actor: null,
                    workspace: fileDocument.workspace,
                    entityId: fileDocument._id,
                    metadata: {
                        sizeBytes:
                            fileDocument.sizeBytes,
                        purgeScheduledAt:
                            fileDocument.purgeScheduledAt,
                    },
                }),
                {
                    session: {
                        id: 'session',
                    },
                },
            );

        expect(result).toEqual({
            selected: 1,
            claimed: 1,
            purged: 1,
            skipped: 0,
            hasMore: false,
        });
    });

    it('ne touche pas au provider si un autre worker gagne le claim atomique', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');

        findMock.mockReturnValue(
            createFindChain([createCandidate()]),
        );
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery(null),
        );

        const result = await purgeDeletedFiles({
            now,
        });

        expect(deleteFileMock).not.toHaveBeenCalled();
        expect(findOneMock).not.toHaveBeenCalled();
        expect(releaseCurrentUsageMetricMock)
            .not.toHaveBeenCalled();
        expect(createAuditLogMock)
            .not.toHaveBeenCalled();

        expect(result).toMatchObject({
            selected: 1,
            claimed: 0,
            purged: 0,
            skipped: 1,
            hasMore: false,
        });
    });

    it('reprend un claim expiré après un crash de worker', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');
        const candidate = createCandidate();
        const fileDocument = createFileDocument();

        findMock.mockReturnValue(
            createFindChain([candidate]),
        );
        findOneAndUpdateMock
            .mockReturnValueOnce(
                createLeanQuery(null),
            )
            .mockReturnValueOnce(
                createLeanQuery(candidate),
            );
        findOneMock.mockReturnValue(
            createFinalizeQuery(fileDocument),
        );
        deleteFileMock.mockResolvedValue({
            deleted: false,
        });
        releaseCurrentUsageMetricMock
            .mockResolvedValue({});
        createAuditLogMock.mockResolvedValue({});

        const result = await purgeDeletedFiles({
            now,
        });

        const staleClaimFilter =
            findOneAndUpdateMock.mock.calls[1][0];

        expect(staleClaimFilter).toEqual({
            _id: candidate._id,
            status: 'deleted',
            purgeScheduledAt: {
                $lte: now,
            },
            purgeClaimExpiresAt: {
                $lte: now,
            },
        });
        expect(result).toMatchObject({
            claimed: 1,
            purged: 1,
            skipped: 0,
        });
    });

    it('ne libère pas le quota si le claim est perdu avant la finalisation', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');
        const candidate = createCandidate();

        findMock.mockReturnValue(
            createFindChain([candidate]),
        );
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery(candidate),
        );
        findOneMock.mockReturnValue(
            createFinalizeQuery(null),
        );
        deleteFileMock.mockResolvedValue({
            deleted: true,
        });

        const result = await purgeDeletedFiles({
            now,
        });

        expect(deleteFileMock).toHaveBeenCalledOnce();
        expect(releaseCurrentUsageMetricMock)
            .not.toHaveBeenCalled();
        expect(createAuditLogMock)
            .not.toHaveBeenCalled();
        expect(result).toMatchObject({
            selected: 1,
            claimed: 1,
            purged: 0,
            skipped: 1,
        });
    });

    it('ne décrémente pas une seconde fois un ancien DELETED pas encore réconcilié', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');
        const candidate = createCandidate();
        const fileDocument = createFileDocument({
            storageUsageReleasePending: false,
        });

        findMock.mockReturnValue(
            createFindChain([candidate]),
        );
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery(candidate),
        );
        findOneMock.mockReturnValue(
            createFinalizeQuery(fileDocument),
        );
        deleteFileMock.mockResolvedValue({
            deleted: false,
        });
        createAuditLogMock.mockResolvedValue({});

        const result = await purgeDeletedFiles({
            now,
        });

        expect(releaseCurrentUsageMetricMock)
            .not.toHaveBeenCalled();
        expect(fileDocument.status).toBe('purged');
        expect(result.purged).toBe(1);
    });

    it('conserve le claim et ne finalise rien si le provider échoue', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');
        const candidate = createCandidate();

        findMock.mockReturnValue(
            createFindChain([candidate]),
        );
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery(candidate),
        );
        deleteFileMock.mockRejectedValue(
            new Error('storage unavailable'),
        );

        await expect(
            purgeDeletedFiles({ now }),
        ).rejects.toThrow(
            'storage unavailable',
        );

        expect(findOneMock).not.toHaveBeenCalled();
        expect(releaseCurrentUsageMetricMock)
            .not.toHaveBeenCalled();
        expect(createAuditLogMock)
            .not.toHaveBeenCalled();

        const claimUpdate =
            findOneAndUpdateMock.mock.calls[0][1];

        expect(claimUpdate.$set.purgeClaimedAt)
            .toBe(now);
        expect(claimUpdate.$set.purgeClaimId)
            .toEqual(expect.any(String));
    });

    it('signale un lot plein pour permettre un nouveau passage', async () => {
        const now =
            new Date('2026-09-30T12:00:00.000Z');
        const candidates = [
            createCandidate({
                _id: 'file-1',
                storageKey:
                    'workspaces/workspace-id/file-1.pdf',
            }),
            createCandidate({
                _id: 'file-2',
                storageKey:
                    'workspaces/workspace-id/file-2.pdf',
            }),
        ];

        findMock.mockReturnValue(
            createFindChain(candidates),
        );
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery(null),
        );

        const result = await purgeDeletedFiles({
            now,
            batchSize: 2,
        });

        expect(result).toEqual({
            selected: 2,
            claimed: 0,
            purged: 0,
            skipped: 2,
            hasMore: true,
        });
    });
});
