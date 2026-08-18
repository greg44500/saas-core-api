import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    FILE_CATEGORY,
    FILE_STATUS,
} from '../../constants/file.constants.js';

import {
    upload,
} from '../../modules/file/file.controller.js';

import {
    fileService,
} from '../../modules/file/file.service.js';


vi.mock(
    '../../modules/file/file.service.js',
    () => ({
        fileService: {
            persistUploadedFile: vi.fn(),
        },
    }),
);


describe('File controller', () => {
    it('persiste l’upload dans le workspace courant et retourne un contrat public', async () => {
        const workspaceId =
            '64b64c0f2f4b1a0012345678';

        const userId =
            '64b64c0f2f4b1a0087654321';

        const createdAt = new Date(
            '2026-08-18T15:00:00.000Z',
        );

        const updatedAt = new Date(
            '2026-08-18T15:00:01.000Z',
        );

        const uploadedFile = {
            path: '/temporary/uploaded-file',
            originalname: 'document.pdf',
            mimetype: 'application/pdf',
            size: 1_024,
        };

        fileService.persistUploadedFile
            .mockResolvedValue({
                _id: {
                    toString: () => 'file-id',
                },
                originalName: 'document.pdf',
                mimeType: 'application/pdf',
                extension: 'pdf',
                sizeBytes: 1_024,
                category:
                    FILE_CATEGORY.DOCUMENT,
                status: FILE_STATUS.ACTIVE,
                createdAt,
                updatedAt,

                /*
                 * Ces champs internes existent sur le document mais ne
                 * doivent pas être recopiés dans la réponse publique.
                 */
                storedName:
                    'generated-storage-id.pdf',
                storageProvider: 'local',
                storageKey:
                    'workspaces/workspace-id/generated-storage-id.pdf',
                checksumSha256: 'a'.repeat(64),
                malwareScan: {
                    status: 'clean',
                    provider: 'clamav-local',
                },
            });

        const request = {
            workspace: {
                _id: workspaceId,
            },
            user: {
                _id: userId,
            },
            file: uploadedFile,
            validated: {
                body: {
                    category:
                        FILE_CATEGORY.DOCUMENT,
                },
            },
        };

        const response = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await upload(request, response);

        expect(
            fileService.persistUploadedFile,
        ).toHaveBeenCalledWith({
            workspaceId,
            uploadedBy: userId,
            file: uploadedFile,
            category: FILE_CATEGORY.DOCUMENT,
        });

        expect(response.status)
            .toHaveBeenCalledWith(201);

        expect(response.json)
            .toHaveBeenCalledWith({
                status: 'success',
                data: {
                    file: {
                        id: 'file-id',
                        originalName:
                            'document.pdf',
                        mimeType:
                            'application/pdf',
                        extension: 'pdf',
                        sizeBytes: 1_024,
                        category:
                            FILE_CATEGORY.DOCUMENT,
                        status:
                            FILE_STATUS.ACTIVE,
                        createdAt,
                        updatedAt,
                    },
                },
            });
    });
});