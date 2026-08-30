import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { remove } from '../../modules/file/file.controller.js';
import {
    deleteWorkspaceFile,
} from '../../modules/file/fileDelete.service.js';

vi.mock('../../modules/file/file.service.js', () => ({
    fileService: {
        persistUploadedFile: vi.fn(),
    },
}));

vi.mock('../../modules/file/fileRead.service.js', () => ({
    listWorkspaceFiles: vi.fn(),
    getWorkspaceFile: vi.fn(),
    openWorkspaceFileDownload: vi.fn(),
}));

vi.mock('../../modules/file/fileDelete.service.js', () => ({
    deleteWorkspaceFile: vi.fn(),
}));

describe('File delete controller', () => {
    it('utilise le contexte authentifié puis répond 204', async () => {
        const request = {
            workspace: {
                _id: '507f1f77bcf86cd799439011',
            },
            user: {
                _id: '507f1f77bcf86cd799439013',
            },
            validated: {
                params: {
                    fileId: '507f1f77bcf86cd799439012',
                },
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent',
            },
        };

        const response = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };

        deleteWorkspaceFile.mockResolvedValue(undefined);

        await remove(request, response);

        expect(deleteWorkspaceFile).toHaveBeenCalledWith({
            workspaceId: '507f1f77bcf86cd799439011',
            fileId: '507f1f77bcf86cd799439012',
            actorId: '507f1f77bcf86cd799439013',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });
        expect(response.status).toHaveBeenCalledWith(204);
        expect(response.send).toHaveBeenCalledOnce();
    });
});
