import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    SYSTEM_ROLE_DEFINITIONS,
} from '../../constants/role.constants.js';
import { Role } from '../../modules/role/role.model.js';
import {
    createSystemRolesForWorkspace,
    listWorkspaceRoles,
} from '../../modules/role/role.service.js';


describe('role.service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crée les cinq rôles système dans la transaction reçue', async () => {
        const workspaceId = 'workspace-id';
        const actorId = 'actor-id';
        const session = { id: 'mongo-session' };

        const createdRoles = [
            { _id: 'owner-role-id' },
            { _id: 'admin-role-id' },
            { _id: 'manager-role-id' },
            { _id: 'member-role-id' },
            { _id: 'reader-role-id' },
        ];

        const insertManySpy = vi
            .spyOn(Role, 'insertMany')
            .mockResolvedValue(createdRoles);

        const result = await createSystemRolesForWorkspace({
            workspaceId,
            actorId,
            session,
        });

        const expectedRoles = SYSTEM_ROLE_DEFINITIONS.map(
            (definition) => ({
                workspace: workspaceId,
                key: definition.key,
                name: definition.name,
                description: definition.description,
                permissions: [...definition.permissions],
                isSystem: definition.isSystem,
                isEditable: definition.isEditable,
                createdBy: actorId,
                updatedBy: actorId,
            }),
        );

        expect(insertManySpy).toHaveBeenCalledOnce();
        expect(insertManySpy).toHaveBeenCalledWith(
            expectedRoles,
            { session },
        );
        expect(result).toBe(createdRoles);
    });

    it('refuse de créer les rôles sans session transactionnelle', async () => {
        const insertManySpy = vi.spyOn(Role, 'insertMany');

        await expect(
            createSystemRolesForWorkspace({
                workspaceId: 'workspace-id',
                actorId: 'actor-id',
            }),
        ).rejects.toThrow(
            'workspaceId, actorId and session are required to create system roles',
        );

        expect(insertManySpy).not.toHaveBeenCalled();
    });

    it('expose les permissions des rôles dans le DTO de lecture', async () => {
        const lean = vi.fn().mockResolvedValue([
            {
                _id: { toString: () => 'role-admin' },
                key: 'admin',
                name: 'Administrateur',
                description: 'Administre le workspace.',
                permissions: ['workspace:read', 'member:update'],
                isSystem: true,
                isEditable: false,
            },
        ]);
        const sort = vi.fn(() => ({ lean }));
        const select = vi.fn(() => ({ sort }));
        const findSpy = vi.spyOn(Role, 'find').mockReturnValue({ select });

        const roles = await listWorkspaceRoles({
            workspaceId: 'workspace-id',
        });

        expect(findSpy).toHaveBeenCalledWith({
            workspace: 'workspace-id',
        });
        expect(select).toHaveBeenCalledWith(
            '_id key name description permissions isSystem isEditable',
        );
        expect(roles).toEqual([
            {
                id: 'role-admin',
                key: 'admin',
                name: 'Administrateur',
                description: 'Administre le workspace.',
                permissions: ['workspace:read', 'member:update'],
                isSystem: true,
                isEditable: false,
            },
        ]);
    });
});
