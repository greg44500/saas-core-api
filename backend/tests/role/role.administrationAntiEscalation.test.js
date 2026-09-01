import { describe, expect, it } from 'vitest';

import {
    assertActorCanAdministerRole,
} from '../../modules/role/role.service.js';

describe('role administration anti-escalation', () => {
    it('autorise l’administration d’un rôle lorsque toutes ses permissions sont détenues', () => {
        expect(() => assertActorCanAdministerRole({
            role: {
                permissions: ['workspace:read', 'member:read'],
            },
            actorPermissions: [
                'workspace:read',
                'member:read',
                'role:update',
            ],
        })).not.toThrow();
    });

    it('refuse de modifier ou supprimer un rôle contenant une permission absente chez l’acteur', () => {
        expect(() => assertActorCanAdministerRole({
            role: {
                permissions: ['workspace:read', 'member:remove'],
            },
            actorPermissions: [
                'workspace:read',
                'role:update',
                'role:delete',
            ],
        })).toThrow(
            'Vous ne pouvez pas attribuer un rôle contenant des permissions que vous ne possédez pas.',
        );
    });
});
