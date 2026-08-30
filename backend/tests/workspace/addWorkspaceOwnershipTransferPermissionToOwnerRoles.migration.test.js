import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    migrateWorkspaceOwnershipTransferPermissionToOwnerRoles,
} from '../../migrations/addWorkspaceOwnershipTransferPermissionToOwnerRoles.migration.js';
import { Role } from '../../modules/role/role.model.js';


beforeEach(() => {
    vi.restoreAllMocks();
});


describe('migrateWorkspaceOwnershipTransferPermissionToOwnerRoles', () => {
    it('ajoute idempotemment workspace:ownership:transfer aux seuls rôles owner système', async () => {
        const updateManySpy = vi
            .spyOn(Role.collection, 'updateMany')
            .mockResolvedValue({
                matchedCount: 3,
                modifiedCount: 2,
            });

        const result =
            await migrateWorkspaceOwnershipTransferPermissionToOwnerRoles();

        expect(updateManySpy).toHaveBeenCalledWith(
            {
                isSystem: true,
                key: SYSTEM_ROLE_KEY.OWNER,
            },
            {
                $addToSet: {
                    permissions:
                        CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
                },
            },
        );

        expect(result).toEqual({
            matchedRoles: 3,
            updatedRoles: 2,
        });
    });
});
