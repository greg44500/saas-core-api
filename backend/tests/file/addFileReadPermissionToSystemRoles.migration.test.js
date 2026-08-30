import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateManyMock } = vi.hoisted(() => ({
    updateManyMock: vi.fn(),
}));

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        collection: {
            updateMany: updateManyMock,
        },
    },
}));

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    migrateFileReadPermissionToSystemRoles,
} from '../../migrations/addFileReadPermissionToSystemRoles.migration.js';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('migrateFileReadPermissionToSystemRoles', () => {
    it('ajoute file:read à tous les rôles système existants', async () => {
        updateManyMock.mockResolvedValue({
            matchedCount: 5,
            modifiedCount: 5,
        });

        const result = await migrateFileReadPermissionToSystemRoles();

        expect(updateManyMock).toHaveBeenCalledWith(
            {
                isSystem: true,
                key: {
                    $in: Object.values(SYSTEM_ROLE_KEY),
                },
            },
            {
                $addToSet: {
                    permissions: CORE_PERMISSION.FILE_READ,
                },
            },
        );

        expect(result).toEqual({
            matchedRoles: 5,
            updatedRoles: 5,
        });
    });
});
