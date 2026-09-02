import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    User,
} from '../../../modules/users/user.model.js';

import {
    Workspace,
} from '../../../modules/workspace/workspace.model.js';

import {
    getPlatformWorkspace,
} from '../../../modules/platform/workspaces/services/getPlatformWorkspace.service.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            find: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/workspace/workspace.model.js',
    () => ({
        Workspace: {
            findById: vi.fn(),
        },
    }),
);


const createId = (value) => ({
    toString: () => value,
});


const createUserQuery = (users) => ({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(users),
});


describe('getPlatformWorkspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne le détail avec des acteurs lisibles et une projection User minimale', async () => {
        const workspaceDocument = {
            _id: createId('workspace-1'),
            name: 'Workspace Alpha',
            status: 'suspended',
            statusReason: 'administrative_review',
            statusReasonDetails:
                'Vérification administrative en cours',
            statusChangedAt: new Date(
                '2026-08-20T10:00:00.000Z',
            ),
            statusChangedBy: createId('admin-1'),
            createdBy: createId('user-1'),
            updatedBy: createId('admin-1'),
            createdAt: new Date(
                '2026-08-01T09:00:00.000Z',
            ),
            updatedAt: new Date(
                '2026-08-20T10:00:00.000Z',
            ),
        };

        const workspaceQuery = {
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(
                workspaceDocument,
            ),
        };

        const actorUsers = [
            {
                _id: createId('admin-1'),
                firstName: 'Admin',
                lastName: 'Platform',
                email: 'admin@example.com',
            },
            {
                _id: createId('user-1'),
                firstName: 'Alice',
                lastName: 'Martin',
                email: 'alice@example.com',
            },
        ];
        const userQuery = createUserQuery(actorUsers);

        Workspace.findById.mockReturnValue(workspaceQuery);
        User.find.mockReturnValue(userQuery);

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
            statusChangedBy: {
                id: 'admin-1',
                firstName: 'Admin',
                lastName: 'Platform',
                email: 'admin@example.com',
            },
            createdBy: {
                id: 'user-1',
                firstName: 'Alice',
                lastName: 'Martin',
                email: 'alice@example.com',
            },
            updatedBy: {
                id: 'admin-1',
                firstName: 'Admin',
                lastName: 'Platform',
                email: 'admin@example.com',
            },
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
        expect(User.find).toHaveBeenCalledOnce();
        expect(userQuery.select).toHaveBeenCalledWith(
            '_id firstName lastName email',
        );
    });

    it('conserve l’identifiant historique lorsque l’utilisateur n’est plus résoluble', async () => {
        const workspaceDocument = {
            _id: createId('workspace-1'),
            name: 'Workspace Alpha',
            status: 'active',
            statusReason: null,
            statusReasonDetails: null,
            statusChangedAt: new Date(),
            statusChangedBy: createId('missing-user'),
            createdBy: createId('missing-user'),
            updatedBy: createId('missing-user'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        Workspace.findById.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(workspaceDocument),
        });
        User.find.mockReturnValue(createUserQuery([]));

        const result = await getPlatformWorkspace({
            workspaceId: 'workspace-1',
        });

        expect(result.createdBy).toEqual({
            id: 'missing-user',
            firstName: null,
            lastName: null,
            email: null,
        });
        expect(result.updatedBy).toEqual(result.createdBy);
        expect(result.statusChangedBy).toEqual(result.createdBy);
    });

    it('retourne null sans lire User lorsque le workspace n’existe pas', async () => {
        const query = {
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(null),
        };

        Workspace.findById.mockReturnValue(query);

        const result = await getPlatformWorkspace({
            workspaceId: 'workspace-1',
        });

        expect(result).toBeNull();
        expect(User.find).not.toHaveBeenCalled();
    });

    it('refuse un workspaceId absent avant tout accès à la base', async () => {
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
        expect(User.find).not.toHaveBeenCalled();
    });
});
