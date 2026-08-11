import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createWorkspaceSchema,
} from '../../modules/workspace/workspace.validation.js';


describe('createWorkspaceSchema', () => {
    it('valide et normalise le nom du workspace', () => {
        const result = createWorkspaceSchema.parse({
            name: '  Acme  ',
        });

        expect(result).toEqual({
            name: 'Acme',
        });
    });


    it('refuse un nom invalide ou un champ non autorisé', () => {
        expect(
            createWorkspaceSchema.safeParse({
                name: 'A',
            }).success,
        ).toBe(false);

        expect(
            createWorkspaceSchema.safeParse({
                name: 'Acme',
                createdBy: 'another-user-id',
            }).success,
        ).toBe(false);
    });
});