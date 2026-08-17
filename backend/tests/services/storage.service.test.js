import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    FILE_STORAGE_PROVIDER,
} from '../../constants/file.constants.js';

import {
    createStorageService,
} from '../../services/storage/storage.service.js';


/**
 * Construit un fournisseur simulé respectant le contrat du stockage.
 */
const createProviderMock = (provider) => ({
    provider,

    initialize: vi.fn()
        .mockResolvedValue(undefined),

    storeFromTemporaryPath: vi.fn()
        .mockResolvedValue({
            storageKey:
                'workspaces/workspace-1/document.pdf',
        }),

    deleteFile: vi.fn()
        .mockResolvedValue({
            deleted: true,
        }),

    createFileReadStream: vi.fn()
        .mockResolvedValue({
            mockedStream: true,
        }),
});


describe('Storage service', () => {
    it('utilise le fournisseur configuré par défaut pour un nouvel upload', async () => {
        const localProvider = createProviderMock(
            FILE_STORAGE_PROVIDER.LOCAL,
        );

        const s3Provider = createProviderMock(
            FILE_STORAGE_PROVIDER.S3,
        );

        const service = createStorageService({
            providers: [
                localProvider,
                s3Provider,
            ],
            defaultProvider:
                FILE_STORAGE_PROVIDER.LOCAL,
        });

        const result = await service.storeFile({
            sourcePath: '/temporary/document',
            storageKey:
                'workspaces/workspace-1/document.pdf',
        });

        expect(
            localProvider.storeFromTemporaryPath,
        ).toHaveBeenCalledWith({
            sourcePath: '/temporary/document',
            storageKey:
                'workspaces/workspace-1/document.pdf',
        });

        expect(
            s3Provider.storeFromTemporaryPath,
        ).not.toHaveBeenCalled();

        expect(result).toEqual({
            storageProvider:
                FILE_STORAGE_PROVIDER.LOCAL,
            storageKey:
                'workspaces/workspace-1/document.pdf',
        });
    });


    it('refuse une opération visant un fournisseur indisponible', async () => {
        const localProvider = createProviderMock(
            FILE_STORAGE_PROVIDER.LOCAL,
        );

        const service = createStorageService({
            providers: [
                localProvider,
            ],
            defaultProvider:
                FILE_STORAGE_PROVIDER.LOCAL,
        });

        await expect(
            service.deleteFile({
                provider: FILE_STORAGE_PROVIDER.S3,
                storageKey:
                    'workspaces/workspace-1/document.pdf',
            }),
        ).rejects.toThrow(
            "Le fournisseur de stockage s3 n'est pas disponible.",
        );

        expect(
            localProvider.deleteFile,
        ).not.toHaveBeenCalled();
    });
});