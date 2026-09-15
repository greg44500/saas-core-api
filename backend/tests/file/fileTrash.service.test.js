import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { FILE_STATUS } from '../../constants/file.constants.js';
import {
    listWorkspaceTrashFiles,
    restoreWorkspaceFile,
} from '../../modules/file/fileTrash.service.js';
import { File } from '../../modules/file/file.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { storageService } from '../../services/storage/storage.service.js';

const {
    transaction,
} = vi.hoisted(() => ({
    transaction: vi.fn(async (callback) => callback('session')),
}));

vi.mock('mongoose', async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        default: {
            ...actual.default,
            connection: {
                transaction,
            },
        },
    };
});

vi.mock('../../modules/file/file.model.js', () => ({
    File: {
        countDocuments: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../services/storage/storage.service.js', () => ({
    storageService: {
        fileExists: vi.fn(),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(
        async (callback) => callback('session'),
    );
});

const buildDeletedFile = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439012',
    workspace: '507f1f77bcf86cd799439011',
    originalName: 'rapport.pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: 2_048,
    category: 'document',
    status: FILE_STATUS.DELETED,
    uploadedBy: '507f1f77bcf86cd799439013',
    deletedBy: '507f1f77bcf86cd799439014',
    deletedAt: new Date('2026-09-01T10:00:00.000Z'),
    purgeScheduledAt: new Date('2026-10-01T10:00:00.000Z'),
    purgeClaimedAt: null,
    purgeClaimId: null,
    purgeClaimExpiresAt: null,
    storageUsageReleasePending: true,
    storageProvider: 'local',
    storageKey: 'workspace/rapport.pdf',
    purgedAt: null,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
});

const mockFindOneLean = (value) => {
    const lean = vi.fn().mockResolvedValue(value);
    const select = vi.fn().mockReturnValue({ lean });
    File.findOne.mockReturnValue({ select });
    return { select, lean };
};

describe('listWorkspaceTrashFiles', () => {
    it('liste uniquement la corbeille du workspace avec pagination', async () => {
        const deletedFile = buildDeletedFile();
        const lean = vi.fn().mockResolvedValue([deletedFile]);
        const limit = vi.fn().mockReturnValue({ lean });
        const skip = vi.fn().mockReturnValue({ limit });
        const sort = vi.fn().mockReturnValue({ skip });
        File.find.mockReturnValue({ sort });
        File.countDocuments.mockResolvedValue(1);

        const result = await listWorkspaceTrashFiles({
            workspaceId: deletedFile.workspace,
            page: 2,
            limit: 10,
            category: 'document',
            search: 'rapport',
        });

        expect(File.find).toHaveBeenCalledWith({
            workspace: deletedFile.workspace,
            status: FILE_STATUS.DELETED,
            category: 'document',
            originalName: {
                $regex: 'rapport',
                $options: 'i',
            },
        });
        expect(sort).toHaveBeenCalledWith({
            deletedAt: -1,
            _id: -1,
        });
        expect(skip).toHaveBeenCalledWith(10);
        expect(limit).toHaveBeenCalledWith(10);
        expect(File.countDocuments).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: deletedFile.workspace,
                status: FILE_STATUS.DELETED,
            }),
        );
        expect(result.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
        expect(result.files).toEqual([
            expect.objectContaining({
                id: deletedFile._id,
                originalName: 'rapport.pdf',
                status: FILE_STATUS.DELETED,
                deletedAt: deletedFile.deletedAt,
                purgeScheduledAt: deletedFile.purgeScheduledAt,
            }),
        ]);
    });
});

describe('restoreWorkspaceFile', () => {
    it('refuse un fichier absent de la corbeille du workspace', async () => {
        mockFindOneLean(null);

        await expect(restoreWorkspaceFile({
            workspaceId: '507f1f77bcf86cd799439011',
            fileId: '507f1f77bcf86cd799439012',
            actorId: '507f1f77bcf86cd799439013',
        })).rejects.toMatchObject({
            statusCode: 404,
            message: 'Fichier introuvable dans la corbeille',
        });

        expect(storageService.fileExists).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('refuse la restauration dès que la purge a réclamé le fichier', async () => {
        const candidate = buildDeletedFile({
            purgeClaimedAt: new Date('2026-10-01T10:00:00.000Z'),
            purgeClaimId: 'claim-1',
            purgeClaimExpiresAt: new Date('2026-10-01T10:05:00.000Z'),
        });
        mockFindOneLean(candidate);

        await expect(restoreWorkspaceFile({
            workspaceId: candidate.workspace,
            fileId: candidate._id,
            actorId: '507f1f77bcf86cd799439015',
        })).rejects.toMatchObject({
            statusCode: 409,
            message: 'La restauration est impossible car la purge du fichier a commencé',
        });

        expect(storageService.fileExists).not.toHaveBeenCalled();
        expect(File.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse de réactiver des métadonnées si le contenu physique a disparu', async () => {
        const candidate = buildDeletedFile();
        mockFindOneLean(candidate);
        storageService.fileExists.mockResolvedValue(false);

        await expect(restoreWorkspaceFile({
            workspaceId: candidate.workspace,
            fileId: candidate._id,
            actorId: '507f1f77bcf86cd799439015',
        })).rejects.toMatchObject({
            statusCode: 409,
            message: 'La restauration est impossible car le contenu du fichier n’est plus disponible',
        });

        expect(storageService.fileExists).toHaveBeenCalledWith({
            provider: candidate.storageProvider,
            storageKey: candidate.storageKey,
        });
        expect(File.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('restaure atomiquement le fichier sans réserver le stockage une seconde fois', async () => {
        const actorId = '507f1f77bcf86cd799439015';
        const candidate = buildDeletedFile();
        const restored = buildDeletedFile({
            status: FILE_STATUS.ACTIVE,
            deletedAt: null,
            deletedBy: null,
            purgeScheduledAt: null,
            storageUsageReleasePending: false,
            updatedAt: new Date('2026-09-15T12:00:00.000Z'),
        });

        mockFindOneLean(candidate);
        storageService.fileExists.mockResolvedValue(true);
        File.findOneAndUpdate.mockResolvedValue(restored);

        const result = await restoreWorkspaceFile({
            workspaceId: candidate.workspace,
            fileId: candidate._id,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });

        expect(File.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: candidate._id,
                workspace: candidate.workspace,
                status: FILE_STATUS.DELETED,
                purgeClaimedAt: null,
                purgeClaimId: null,
                purgeClaimExpiresAt: null,
            },
            {
                $set: {
                    status: FILE_STATUS.ACTIVE,
                    deletedAt: null,
                    deletedBy: null,
                    purgeScheduledAt: null,
                    purgeClaimedAt: null,
                    purgeClaimId: null,
                    purgeClaimExpiresAt: null,
                    storageUsageReleasePending: false,
                    purgedAt: null,
                    updatedBy: actorId,
                },
            },
            {
                new: true,
                runValidators: true,
                session: 'session',
            },
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: actorId,
                workspace: candidate.workspace,
                action: AUDIT_ACTION.FILE_RESTORED,
                entityType: AUDIT_ENTITY_TYPE.FILE,
                entityId: restored._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent',
                metadata: {
                    sizeBytes: restored.sizeBytes,
                    deletedAt: candidate.deletedAt,
                    purgeScheduledAt: candidate.purgeScheduledAt,
                },
            },
            { session: 'session' },
        );
        expect(result).toEqual(expect.objectContaining({
            id: restored._id,
            status: FILE_STATUS.ACTIVE,
        }));
    });

    it('refuse la restauration si la purge gagne la course après la vérification physique', async () => {
        const candidate = buildDeletedFile();
        mockFindOneLean(candidate);
        storageService.fileExists.mockResolvedValue(true);
        File.findOneAndUpdate.mockResolvedValue(null);

        await expect(restoreWorkspaceFile({
            workspaceId: candidate.workspace,
            fileId: candidate._id,
            actorId: '507f1f77bcf86cd799439015',
        })).rejects.toMatchObject({
            statusCode: 409,
            message: 'La restauration est impossible car l’état du fichier a changé',
        });

        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
