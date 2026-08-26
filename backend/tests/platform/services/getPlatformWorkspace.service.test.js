import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    Workspace,
} from '../../../modules/workspace/workspace.model.js';

import {
    getPlatformWorkspace,
} from '../../../modules/platform/services/getPlatformWorkspace.service.js';


vi.mock(
    '../../../modules/workspace/workspace.model.js',
    () => ({
        Workspace: {
            findById: vi.fn(),
        },
    }),
);


describe('getPlatformWorkspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne le détail administratif du workspace', async () => {
        const workspaceDocument = {
            _id: {
                toString: () => 'workspace-1',
            },
            name: 'Workspace Alpha',
            status: 'suspended',
            statusReason: 'administrative_review',
            statusReasonDetails:
                'Vérification administrative en cours',
            statusChangedAt: new Date(
                '2026-08-20T10:00:00.000Z',
            ),
            statusChangedBy: {
                toString: () => 'admin-1',
            },
            createdBy: {
                toString: () => 'user-1',
            },
            updatedBy: {
                toString: () => 'admin-1',
            },
            createdAt: new Date(
                '2026-08-01T09:00:00.000Z',
            ),
            updatedAt: new Date(
                '2026-08-20T10:00:00.000Z',
            ),
        };

        const query = {
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(
                workspaceDocument,
            ),
        };

        Workspace.findById.mockReturnValue(query);

        const result = await getPlatformWorkspace({
            workspaceId: 'workspace-1',
        });

        expect(result).toEqual({
            id: 'workspace-1',
            name: 'Workspace Alpha',
            status: 'suspended',
            statusReason:
                'administrative_review',
            statusReasonDetails:
                'Vérification administrative en cours',
            statusChangedAt:
                workspaceDocument.statusChangedAt,
            statusChangedBy:
                'admin-1',
            createdBy:
                'user-1',
            updatedBy:
                'admin-1',
            createdAt:
                workspaceDocument.createdAt,
            updatedAt:
                workspaceDocument.updatedAt,
        });

        expect(
            Workspace.findById,
        ).toHaveBeenCalledWith(
            'workspace-1',
        );
    });

    it('retourne null lorsque le workspace n’existe pas', async () => {
        const query = {
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(null),
        };

        Workspace.findById.mockReturnValue(query);

        const result = await getPlatformWorkspace({
            workspaceId: 'workspace-1',
        });

        expect(result).toBeNull();
    });

    it('refuse un workspaceId absent', async () => {
        await expect(
            getPlatformWorkspace({
                workspaceId: '',
            }),
        ).rejects.toThrow(
            'workspaceId is required to get a platform workspace',
        );

        expect(
            Workspace.findById,
        ).not.toHaveBeenCalled();
    });
});