import { describe, expect, it } from 'vitest';

import {
    archiveWorkspaceBodySchema,
} from '../../modules/workspace/workspaceClosure.validation.js';

describe('archiveWorkspaceBodySchema', () => {
    it('accepte le mot de passe courant et le nom exact de confirmation', () => {
        expect(archiveWorkspaceBodySchema.parse({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: '  Acme  ',
        })).toEqual({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'Acme',
        });
    });

    it('refuse une confirmation trop courte ou un champ supplémentaire', () => {
        expect(() => archiveWorkspaceBodySchema.parse({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'A',
        })).toThrow();

        expect(() => archiveWorkspaceBodySchema.parse({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'Acme',
            force: true,
        })).toThrow();
    });
});
