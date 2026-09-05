import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
} from '../../config/applicationRolePermission.registry.js';
import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    getActiveRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';


describe('application role permission registry', () => {
    it('configure le registre runtime actif avec le registre applicatif', () => {
        expect(getActiveRolePermissionRegistry()).toBe(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
        );
    });

    it('conserve toutes les permissions Core dans le registre applicatif', () => {
        expect(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
        ).toEqual(
            expect.arrayContaining(Object.values(CORE_PERMISSION)),
        );
    });
});
