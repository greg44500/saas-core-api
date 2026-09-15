import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getWorkspaceFileStorageUsage: vi.fn(),
}));

vi.mock('../../modules/file/fileStorage.service.js', () => ({
    getWorkspaceFileStorageUsage:
        mocks.getWorkspaceFileStorageUsage,
}));

import {
    getStorageUsage,
} from '../../modules/file/file.controller.js';


describe('File storage controller', () => {
    it('retourne uniquement le résumé public de stockage du workspace chargé', async () => {
        const storage = {
            usedBytes: 640,
            limitBytes: 1000,
            remainingBytes: 360,
            unlimited: false,
            overLimit: false,
        };

        mocks.getWorkspaceFileStorageUsage
            .mockResolvedValue(storage);

        const request = {
            workspace: {
                _id: 'workspace-1',
            },
        };
        const response = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        await getStorageUsage(request, response);

        expect(
            mocks.getWorkspaceFileStorageUsage,
        ).toHaveBeenCalledWith({
            workspaceId: 'workspace-1',
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({
            status: 'success',
            data: { storage },
        });
    });
});
