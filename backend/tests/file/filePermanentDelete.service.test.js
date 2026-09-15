import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    claimPurgeCandidateMock,
    deleteFileMock,
    finalizePurgedFileMock,
    findOneAndUpdateMock,
    findOneMock,
} = vi.hoisted(() => ({
    claimPurgeCandidateMock: vi.fn(),
    deleteFileMock: vi.fn(),
    finalizePurgedFileMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(),
    findOneMock: vi.fn(),
}));

vi.mock('../../modules/file/file.model.js', () => ({
    File: {
        findOne: findOneMock,
        findOneAndUpdate: findOneAndUpdateMock,
    },
}));

vi.mock('../../services/storage/storage.service.js', () => ({
    storageService: {
        deleteFile: deleteFileMock,
    },
}));

vi.mock('../../modules/file/filePurge.service.js', () => ({
    claimPurgeCandidate: claimPurgeCandidateMock,
    finalizePurgedFile: finalizePurgedFileMock,
}));

import {
    AUDIT_ACTION,
} from '../../constants/auditActions.constants.js';
import {
    permanentlyDeleteWorkspaceFile,
} from '../../modules/file/filePermanentDelete.service.js';

const createLeanQuery = (result) => ({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
});

const candidate = {
    _id: 'file-id',
    deletedAt: new Date('2026-09-15T14:00:00.000Z'),
    purgeScheduledAt: new Date('2026-10-15T14:00:00.000Z'),
    purgeClaimedAt: null,
    purgeClaimId: null,
    purgeClaimExpiresAt: null,
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('permanentlyDeleteWorkspaceFile', () => {
    it('refuse un fichier absent de la corbeille sans révéler une autre ressource', async () => {
        findOneMock.mockReturnValue(createLeanQuery(null));

        await expect(
            permanentlyDeleteWorkspaceFile({
                workspaceId: 'workspace-id',
                fileId: 'file-id',
                actorId: 'user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(findOneAndUpdateMock).not.toHaveBeenCalled();
        expect(deleteFileMock).not.toHaveBeenCalled();
    });

    it('refuse si une suppression définitive détient déjà un claim actif', async () => {
        const now = new Date('2026-09-15T16:00:00.000Z');
        findOneMock.mockReturnValue(createLeanQuery({
            ...candidate,
            purgeClaimedAt: new Date('2026-09-15T15:59:00.000Z'),
            purgeClaimId: 'claim-id',
            purgeClaimExpiresAt: new Date('2026-09-15T16:04:00.000Z'),
        }));

        await expect(
            permanentlyDeleteWorkspaceFile({
                workspaceId: 'workspace-id',
                fileId: 'file-id',
                actorId: 'user-id',
                now,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(findOneAndUpdateMock).not.toHaveBeenCalled();
        expect(deleteFileMock).not.toHaveBeenCalled();
    });

    it('avance l’échéance puis réutilise le claim et la finalisation sécurisés', async () => {
        const now = new Date('2026-09-15T16:00:00.000Z');
        const claimedFile = {
            _id: 'file-id',
            workspace: 'workspace-id',
            storageProvider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
        };

        findOneMock.mockReturnValue(createLeanQuery(candidate));
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery({ _id: 'file-id' }),
        );
        claimPurgeCandidateMock.mockResolvedValue({
            claimId: 'claim-id',
            file: claimedFile,
        });
        deleteFileMock.mockResolvedValue({ deleted: true });
        finalizePurgedFileMock.mockResolvedValue({ _id: 'file-id' });

        await permanentlyDeleteWorkspaceFile({
            workspaceId: 'workspace-id',
            fileId: 'file-id',
            actorId: 'user-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
            now,
        });

        expect(findOneAndUpdateMock).toHaveBeenCalledWith(
            {
                _id: 'file-id',
                workspace: 'workspace-id',
                status: 'deleted',
                purgeScheduledAt: candidate.purgeScheduledAt,
                purgeClaimId: null,
                purgeClaimExpiresAt: null,
            },
            {
                $set: {
                    purgeScheduledAt: now,
                    updatedBy: 'user-id',
                },
            },
            {
                new: true,
                runValidators: true,
            },
        );

        expect(claimPurgeCandidateMock).toHaveBeenCalledWith({
            fileId: 'file-id',
            workspaceId: 'workspace-id',
            now,
            actorId: 'user-id',
        });
        expect(deleteFileMock).toHaveBeenCalledWith({
            provider: 'local',
            storageKey: 'workspaces/workspace-id/file.pdf',
        });
        expect(finalizePurgedFileMock).toHaveBeenCalledWith({
            fileId: 'file-id',
            claimId: 'claim-id',
            now,
            workspaceId: 'workspace-id',
            actorId: 'user-id',
            auditAction: AUDIT_ACTION.FILE_PERMANENTLY_DELETED,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });
    });

    it('décale d’une milliseconde une demande dans le même instant que le soft-delete', async () => {
        const now = new Date('2026-09-15T16:00:00.000Z');
        findOneMock.mockReturnValue(createLeanQuery({
            ...candidate,
            deletedAt: now,
        }));
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery({ _id: 'file-id' }),
        );
        claimPurgeCandidateMock.mockResolvedValue({
            claimId: 'claim-id',
            file: {
                _id: 'file-id',
                storageProvider: 'local',
                storageKey: 'file.pdf',
            },
        });
        deleteFileMock.mockResolvedValue({ deleted: true });
        finalizePurgedFileMock.mockResolvedValue({ _id: 'file-id' });

        await permanentlyDeleteWorkspaceFile({
            workspaceId: 'workspace-id',
            fileId: 'file-id',
            actorId: 'user-id',
            now,
        });

        const operationAt = new Date(now.getTime() + 1);
        expect(
            findOneAndUpdateMock.mock.calls[0][1].$set.purgeScheduledAt,
        ).toEqual(operationAt);
        expect(claimPurgeCandidateMock).toHaveBeenCalledWith(
            expect.objectContaining({ now: operationAt }),
        );
    });

    it('n’appelle jamais le provider si la transition d’échéance perd une course', async () => {
        findOneMock.mockReturnValue(createLeanQuery(candidate));
        findOneAndUpdateMock.mockReturnValue(createLeanQuery(null));

        await expect(
            permanentlyDeleteWorkspaceFile({
                workspaceId: 'workspace-id',
                fileId: 'file-id',
                actorId: 'user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(claimPurgeCandidateMock).not.toHaveBeenCalled();
        expect(deleteFileMock).not.toHaveBeenCalled();
    });

    it('n’appelle jamais le provider si le claim atomique est perdu', async () => {
        findOneMock.mockReturnValue(createLeanQuery(candidate));
        findOneAndUpdateMock.mockReturnValue(
            createLeanQuery({ _id: 'file-id' }),
        );
        claimPurgeCandidateMock.mockResolvedValue(null);

        await expect(
            permanentlyDeleteWorkspaceFile({
                workspaceId: 'workspace-id',
                fileId: 'file-id',
                actorId: 'user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(deleteFileMock).not.toHaveBeenCalled();
        expect(finalizePurgedFileMock).not.toHaveBeenCalled();
    });
});
