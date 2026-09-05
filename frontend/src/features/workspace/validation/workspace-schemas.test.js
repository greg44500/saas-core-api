import { describe, expect, it } from 'vitest';

import {
  createArchiveWorkspaceSchema,
  createWorkspaceSchema,
} from '@/features/workspace/validation/workspace-schemas';

describe('workspace schemas', () => {
  it('trim le nom de création et accepte 2 à 120 caractères', () => {
    const result = createWorkspaceSchema.parse({ name: '  Mon espace  ' });
    expect(result).toEqual({ name: 'Mon espace' });
  });

  it('refuse un nom de création trop court après trim', () => {
    const result = createWorkspaceSchema.safeParse({ name: ' a ' });
    expect(result.success).toBe(false);
  });

  it('refuse un nom de création de plus de 120 caractères', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'a'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('valide l’archivage uniquement avec le nom exact attendu', () => {
    const schema = createArchiveWorkspaceSchema('Workspace Démo');

    expect(schema.parse({
      currentPassword: 'mot-de-passe-actuel-long',
      confirmationName: '  Workspace Démo  ',
    })).toEqual({
      currentPassword: 'mot-de-passe-actuel-long',
      confirmationName: 'Workspace Démo',
    });

    const invalidResult = schema.safeParse({
      currentPassword: 'mot-de-passe-actuel-long',
      confirmationName: 'workspace démo',
    });

    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error?.issues[0].path).toEqual(['confirmationName']);
  });

  it('refuse les champs supplémentaires dans la confirmation d’archivage', () => {
    const schema = createArchiveWorkspaceSchema('Workspace Démo');
    const result = schema.safeParse({
      currentPassword: 'mot-de-passe-actuel-long',
      confirmationName: 'Workspace Démo',
      force: true,
    });

    expect(result.success).toBe(false);
  });
});
