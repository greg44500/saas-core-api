import { describe, expect, it } from 'vitest';

import {
    createWorkspaceRoleBodySchema,
    updateWorkspaceRoleBodySchema,
} from '../../modules/role/role.validation.js';


describe('role.validation', () => {
    it('accepte un rôle personnalisé minimal', () => {
        const result = createWorkspaceRoleBodySchema.parse({
            name: 'Support',
            permissions: ['member:read'],
        });

        expect(result).toEqual({
            name: 'Support',
            permissions: ['member:read'],
        });
    });

    it('refuse les propriétés système lors de la création', () => {
        const result = createWorkspaceRoleBodySchema.safeParse({
            name: 'Faux owner',
            permissions: [],
            key: 'owner',
            isSystem: true,
            isEditable: false,
        });

        expect(result.success).toBe(false);
    });

    it('refuse une modification vide', () => {
        const result = updateWorkspaceRoleBodySchema.safeParse({});

        expect(result.success).toBe(false);
    });

    it('refuse une permission au format invalide à la frontière HTTP', () => {
        const result = createWorkspaceRoleBodySchema.safeParse({
            name: 'Support',
            permissions: ['member read'],
        });

        expect(result.success).toBe(false);
    });
});
