import { describe, expect, it } from 'vitest';

import {
    closeWorkspaceBodySchema,
} from '../../modules/workspace/workspaceClosure.validation.js';

describe('closeWorkspaceBodySchema', () => {
    it('accepte le mot de passe courant et le nom exact de confirmation', () => {
        expect(closeWorkspaceBodySchema.parse({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: '  Acme  ',
        })).toEqual({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'Acme',
        });
    });

    it('refuse une confirmation trop courte ou un champ supplémentaire', () => {
        expect(() => closeWorkspaceBodySchema.parse({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'A',
        })).toThrow();

        expect(() => closeWorkspaceBodySchema.parse({
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'Acme',
            force: true,
        })).toThrow();
    });
});
