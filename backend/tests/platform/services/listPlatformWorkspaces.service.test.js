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
    listPlatformWorkspaces,
} from '../../../modules/platform/services/listPlatformWorkspaces.service.js';


vi.mock(
    '../../../modules/workspace/workspace.model.js',
    () => ({
        Workspace: {
            find: vi.fn(),
            countDocuments: vi.fn(),
        },
    }),
);


describe('listPlatformWorkspaces', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne les workspaces transformés avec leur pagination', async () => {
        const workspaceDocuments = [
            {
                _id: {
                    toString: () => 'workspace-1',
                },
                name: 'Workspace Alpha',
                status: 'active',
                statusReason: null,
                statusChangedAt: new Date(
                    '2026-08-20T10:00:00.000Z',
                ),
                createdBy: {
                    toString: () => 'user-1',
                },
                createdAt: new Date(
                    '2026-08-01T09:00:00.000Z',
                ),
                updatedAt: new Date(
                    '2026-08-20T10:00:00.000Z',
                ),
            },
        ];

        const query = {
            select: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(
                workspaceDocuments,
            ),
        };

        Workspace.find.mockReturnValue(query);
        Workspace.countDocuments.mockResolvedValue(1);

        const result = await listPlatformWorkspaces({
            page: 1,
            limit: 20,
        });

        expect(result).toEqual({
            workspaces: [
                {
                    id: 'workspace-1',
                    name: 'Workspace Alpha',
                    status: 'active',
                    statusReason: null,
                    statusChangedAt:
                        workspaceDocuments[0]
                            .statusChangedAt,
                    createdBy: 'user-1',
                    createdAt:
                        workspaceDocuments[0]
                            .createdAt,
                    updatedAt:
                        workspaceDocuments[0]
                            .updatedAt,
                },
            ],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });

        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(20);

        expect(
            Workspace.countDocuments,
        ).toHaveBeenCalledWith({});
    });

    it('applique correctement la pagination demandée', async () => {
        const query = {
            select: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([]),
        };

        Workspace.find.mockReturnValue(query);
        Workspace.countDocuments.mockResolvedValue(45);

        const result = await listPlatformWorkspaces({
            page: 3,
            limit: 10,
        });

        expect(query.skip).toHaveBeenCalledWith(20);
        expect(query.limit).toHaveBeenCalledWith(10);

        expect(result.pagination).toEqual({
            page: 3,
            limit: 10,
            total: 45,
            totalPages: 5,
        });
    });

    it('refuse une pagination invalide', async () => {
        await expect(
            listPlatformWorkspaces({
                page: 0,
                limit: 20,
            }),
        ).rejects.toThrow(
            'page must be an integer greater than or equal to 1',
        );

        await expect(
            listPlatformWorkspaces({
                page: 1,
                limit: 101,
            }),
        ).rejects.toThrow(
            'limit must be an integer between 1 and 100',
        );

        expect(
            Workspace.find,
        ).not.toHaveBeenCalled();

        expect(
            Workspace.countDocuments,
        ).not.toHaveBeenCalled();
    });
});