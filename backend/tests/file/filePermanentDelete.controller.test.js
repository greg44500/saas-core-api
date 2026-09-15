import { describe, expect, it, vi } from 'vitest';

const { permanentlyDeleteWorkspaceFileMock } = vi.hoisted(() => ({
    permanentlyDeleteWorkspaceFileMock: vi.fn(),
}));

vi.mock('../../modules/file/filePermanentDelete.service.js', () => ({
    permanentlyDeleteWorkspaceFile: permanentlyDeleteWorkspaceFileMock,
}));

import {
    removePermanently,
} from '../../modules/file/file.controller.js';

describe('removePermanently', () => {
    it('transmet uniquement le contexte serveur vérifié et répond 204', async () => {
        permanentlyDeleteWorkspaceFileMock.mockResolvedValue(undefined);

        const request = {
            workspace: { _id: 'workspace-id' },
            user: { _id: 'user-id' },
            validated: {
                params: { fileId: 'file-id' },
            },
            context: {
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
            },
        };
        const response = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };

        await removePermanently(request, response);

        expect(permanentlyDeleteWorkspaceFileMock).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            fileId: 'file-id',
            actorId: 'user-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });
        expect(response.status).toHaveBeenCalledWith(204);
        expect(response.send).toHaveBeenCalledOnce();
    });
});
