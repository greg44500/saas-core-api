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
    findOneMock,
    transactionMock,
} = vi.hoisted(() => ({
    createAuditLogMock: vi.fn(),
    deleteFileMock: vi.fn(),
    findMock: vi.fn(),
    findOneMock: vi.fn(),
    transactionMock: vi.fn(async (callback) => callback({ id: 'session' })),
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
    },
}));

vi.mock('../../services/storage/storage.service.js', () => ({
    storageService: {
        deleteFile: deleteFileMock,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: createAuditLogMock,
}));

import {
    purgeDeletedFiles,
} from '../../modules/file/filePurge.service.js';

const createFindChain = (candidates) => ({
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(candidates),
});

beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(
        async (callback) => callback({ id: 'session' }),
    );
});

describe('purgeDeletedFiles', () => {
    it('ne traite que les candidats arrivés à échéance et finalise leur purge', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        const candidate = {
            _id: 'file-id',
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
            purgeScheduledAt: new Date('2026-09-30T10:00:00.000Z'),
        };

        const fileDocument = {
            _id: 'file-id',
            workspace: 'workspace-id',
            status: 'deleted',
            purgeScheduledAt: candidate.purgeScheduledAt,
            purgedAt: null,
            updatedBy: 'previous-actor',
            save: vi.fn().mockResolvedValue(undefined),
        };

        findMock.mockReturnValue(createFindChain([candidate]));
        findOneMock.mockReturnValue({
            session: vi.fn().mockResolvedValue(fileDocument),
        });
        deleteFileMock.mockResolvedValue({ deleted: true });
        createAuditLogMock.mockResolvedValue({});

        const result = await purgeDeletedFiles({
            now,
            batchSize: 25,
        });

        expect(findMock).toHaveBeenCalledWith({
            status: 'deleted',
            purgeScheduledAt: { $lte: now },
        });
        expect(deleteFileMock).toHaveBeenCalledWith({
            provider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
        });
        expect(fileDocument.status).toBe('purged');
        expect(fileDocument.purgedAt).toBe(now);
        expect(fileDocument.updatedBy).toBeNull();
        expect(fileDocument.save).toHaveBeenCalledWith({
            session: { id: 'session' },
        });
        expect(createAuditLogMock).toHaveBeenCalledWith(
            expect.objectContaining({
                actor: null,
                workspace: 'workspace-id',
                action: 'FILE_PURGED',
                entityType: 'File',
                entityId: 'file-id',
                status: 'success',
            }),
            { session: { id: 'session' } },
        );
        expect(result).toEqual({
            selected: 1,
            purged: 1,
            skipped: 0,
        });
    });

    it('considère comme ignoré un candidat déjà finalisé par un autre worker', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        const candidate = {
            _id: 'file-id',
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
            purgeScheduledAt: new Date('2026-09-30T10:00:00.000Z'),
        };

        findMock.mockReturnValue(createFindChain([candidate]));
        findOneMock.mockReturnValue({
            session: vi.fn().mockResolvedValue(null),
        });
        deleteFileMock.mockResolvedValue({ deleted: false });

        const result = await purgeDeletedFiles({ now });

        expect(deleteFileMock).toHaveBeenCalledOnce();
        expect(createAuditLogMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            selected: 1,
            purged: 0,
            skipped: 1,
        });
    });

    it('propage un échec du stockage sans marquer le fichier purged', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        const candidate = {
            _id: 'file-id',
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
            purgeScheduledAt: new Date('2026-09-30T10:00:00.000Z'),
        };

        findMock.mockReturnValue(createFindChain([candidate]));
        deleteFileMock.mockRejectedValue(
            new Error('storage unavailable'),
        );

        await expect(purgeDeletedFiles({ now }))
            .rejects.toThrow('storage unavailable');

        expect(findOneMock).not.toHaveBeenCalled();
        expect(createAuditLogMock).not.toHaveBeenCalled();
    });
});
