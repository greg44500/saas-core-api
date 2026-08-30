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
        connection: { transaction: transactionMock },
        trusted: (value) => value,
    },
}));
vi.mock('../../modules/file/file.model.js', () => ({
    File: { find: findMock, findOne: findOneMock },
}));
vi.mock('../../services/storage/storage.service.js', () => ({
    storageService: { deleteFile: deleteFileMock },
}));
vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: createAuditLogMock,
}));

import { purgeDeletedFiles } from '../../modules/file/filePurge.service.js';

const createFindChain = (candidates) => ({
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(candidates),
});

beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback) => callback({ id: 'session' }));
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
        findOneMock.mockReturnValue({ session: vi.fn().mockResolvedValue(fileDocument) });
        deleteFileMock.mockResolvedValue({ deleted: true });
        createAuditLogMock.mockResolvedValue({});

        const result = await purgeDeletedFiles({ now, batchSize: 25 });

        expect(fileDocument.status).toBe('purged');
        expect(createAuditLogMock).toHaveBeenCalled();
        expect(result).toEqual({
            selected: 1,
            purged: 1,
            skipped: 0,
            hasMore: false,
        });
    });

    it('signale un lot plein pour permettre un nouveau passage', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        const candidates = Array.from({ length: 2 }, (_, index) => ({
            _id: `file-${index}`,
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: `workspaces/workspace-id/file-${index}.pdf`,
            purgeScheduledAt: now,
        }));
        findMock.mockReturnValue(createFindChain(candidates));
        deleteFileMock.mockResolvedValue({ deleted: false });
        findOneMock.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });

        const result = await purgeDeletedFiles({ now, batchSize: 2 });
        expect(result).toEqual({
            selected: 2,
            purged: 0,
            skipped: 2,
            hasMore: true,
        });
    });

    it('considère comme ignoré un candidat déjà finalisé par un autre worker', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        findMock.mockReturnValue(createFindChain([{
            _id: 'file-id',
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
            purgeScheduledAt: now,
        }]));
        findOneMock.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });
        deleteFileMock.mockResolvedValue({ deleted: false });

        const result = await purgeDeletedFiles({ now });
        expect(result).toMatchObject({ purged: 0, skipped: 1, hasMore: false });
        expect(createAuditLogMock).not.toHaveBeenCalled();
    });

    it('propage un échec du stockage sans marquer le fichier purged', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        findMock.mockReturnValue(createFindChain([{
            _id: 'file-id',
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
            purgeScheduledAt: now,
        }]));
        deleteFileMock.mockRejectedValue(new Error('storage unavailable'));

        await expect(purgeDeletedFiles({ now })).rejects.toThrow('storage unavailable');
        expect(findOneMock).not.toHaveBeenCalled();
        expect(createAuditLogMock).not.toHaveBeenCalled();
    });
});
