import { Readable } from 'node:stream';

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    countDocumentsMock,
    createFileReadStreamMock,
    findMock,
    findOneMock,
} = vi.hoisted(() => ({
    countDocumentsMock: vi.fn(),
    createFileReadStreamMock: vi.fn(),
    findMock: vi.fn(),
    findOneMock: vi.fn(),
}));

vi.mock('../../modules/file/file.model.js', () => ({
    File: {
        find: findMock,
        findOne: findOneMock,
        countDocuments: countDocumentsMock,
    },
}));

vi.mock('../../services/storage/storage.service.js', () => ({
    storageService: {
        createFileReadStream: createFileReadStreamMock,
    },
}));

import {
    getWorkspaceFile,
    listWorkspaceFiles,
    openWorkspaceFileDownload,
} from '../../modules/file/fileRead.service.js';

const makeFile = (overrides = {}) => ({
    _id: { toString: () => '507f1f77bcf86cd799439012' },
    uploadedBy: { toString: () => '507f1f77bcf86cd799439020' },
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: 1024,
    category: 'document',
    status: 'active',
    storageProvider: 'local',
    storageKey: 'workspaces/workspace/file.pdf',
    createdAt: new Date('2026-08-30T08:00:00.000Z'),
    updatedAt: new Date('2026-08-30T08:00:00.000Z'),
    ...overrides,
});

const makeListQuery = (files) => {
    const query = {
        sort: vi.fn(() => query),
        skip: vi.fn(() => query),
        limit: vi.fn(() => query),
        lean: vi.fn(async () => files),
    };
    return query;
};

const makeSingleQuery = (file) => ({
    lean: vi.fn(async () => file),
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('fileRead.service', () => {
    it('liste uniquement les fichiers actifs du workspace avec pagination', async () => {
        findMock.mockReturnValue(makeListQuery([makeFile()]));
        countDocumentsMock.mockResolvedValue(1);

        const result = await listWorkspaceFiles({
            workspaceId: 'workspace-id',
            page: 2,
            limit: 10,
        });

        expect(findMock).toHaveBeenCalledWith({
            workspace: 'workspace-id',
            status: 'active',
        });
        expect(countDocumentsMock).toHaveBeenCalledWith({
            workspace: 'workspace-id',
            status: 'active',
        });
        expect(result.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
        expect(result.files[0]).not.toHaveProperty('storageKey');
        expect(result.files[0]).not.toHaveProperty('storageProvider');
    });

    it('applique catégorie et recherche au même filtre que la pagination', async () => {
        findMock.mockReturnValue(makeListQuery([makeFile()]));
        countDocumentsMock.mockResolvedValue(1);

        await listWorkspaceFiles({
            workspaceId: 'workspace-id',
            page: 1,
            limit: 20,
            category: 'document',
            search: 'contrat.*2026',
        });

        const expectedFilter = {
            workspace: 'workspace-id',
            status: 'active',
            category: 'document',
            originalName: {
                $regex: 'contrat\\.\\*2026',
                $options: 'i',
            },
        };

        expect(findMock).toHaveBeenCalledWith(expectedFilter);
        expect(countDocumentsMock).toHaveBeenCalledWith(expectedFilter);
    });

    it('retourne le détail uniquement dans le workspace courant', async () => {
        findOneMock.mockReturnValue(makeSingleQuery(makeFile()));

        const file = await getWorkspaceFile({
            workspaceId: 'workspace-id',
            fileId: 'file-id',
        });

        expect(findOneMock).toHaveBeenCalledWith({
            _id: 'file-id',
            workspace: 'workspace-id',
            status: 'active',
        });
        expect(file.originalName).toBe('document.pdf');
    });

    it('retourne 404 pour un fichier absent, supprimé ou hors workspace', async () => {
        findOneMock.mockReturnValue(makeSingleQuery(null));

        await expect(getWorkspaceFile({
            workspaceId: 'workspace-id',
            fileId: 'file-id',
        })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ouvre le flux uniquement après validation du fichier actif du workspace', async () => {
        const storedFile = makeFile();
        const stream = Readable.from(['content']);
        findOneMock.mockReturnValue(makeSingleQuery(storedFile));
        createFileReadStreamMock.mockResolvedValue(stream);

        const result = await openWorkspaceFileDownload({
            workspaceId: 'workspace-id',
            fileId: 'file-id',
        });

        expect(createFileReadStreamMock).toHaveBeenCalledWith({
            provider: 'local',
            storageKey: 'workspaces/workspace/file.pdf',
        });
        expect(result.stream).toBe(stream);
        expect(result.file).not.toHaveProperty('storageKey');
    });
});
