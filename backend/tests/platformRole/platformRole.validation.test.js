import { describe, expect, it } from 'vitest';

import {
    createPlatformRoleBodySchema,
    listPlatformRolesQuerySchema,
    platformRoleIdParamsSchema,
    updatePlatformRoleBodySchema,
} from '../../modules/platformRole/platformRole.validation.js';


describe('platformRole validation', () => {
    it('accepte un rôle personnalisé sans clé technique fournie par le client', () => {
        const result = createPlatformRoleBodySchema.parse({
            name: '  Support facturation  ',
            description: '  Accès limité à la facturation  ',
            permissions: [
                'platform:overview:read',
                'platform:subscriptions:read',
            ],
        });

        expect(result).toEqual({
            name: 'Support facturation',
            description: 'Accès limité à la facturation',
            permissions: [
                'platform:overview:read',
                'platform:subscriptions:read',
            ],
        });
    });

    it('refuse les champs techniques contrôlés par le backend', () => {
        const result = createPlatformRoleBodySchema.safeParse({
            key: 'super_admin',
            name: 'Faux super admin',
            permissions: [],
        });

        expect(result.success).toBe(false);
    });

    it('refuse les doublons de permissions et les clés mal formées', () => {
        expect(createPlatformRoleBodySchema.safeParse({
            name: 'Doublons',
            permissions: [
                'platform:overview:read',
                'platform:overview:read',
            ],
        }).success).toBe(false);

        expect(createPlatformRoleBodySchema.safeParse({
            name: 'Invalide',
            permissions: ['workspace:read'],
        }).success).toBe(false);
    });

    it('impose au moins un champ lors d’une modification', () => {
        expect(updatePlatformRoleBodySchema.safeParse({}).success).toBe(false);
        expect(updatePlatformRoleBodySchema.safeParse({
            name: 'Support client avancé',
        }).success).toBe(true);
    });

    it('valide les ObjectId et la pagination filtrable par statut', () => {
        expect(platformRoleIdParamsSchema.parse({
            roleId: '507f1f77bcf86cd799439011',
        })).toEqual({
            roleId: '507f1f77bcf86cd799439011',
        });

        expect(listPlatformRolesQuerySchema.parse({
            page: '2',
            limit: '25',
            status: 'archived',
        })).toEqual({
            page: 2,
            limit: 25,
            status: 'archived',
        });
    });
});
