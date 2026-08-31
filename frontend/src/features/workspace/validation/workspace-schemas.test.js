import { describe, expect, it } from 'vitest';

import { createWorkspaceSchema } from '@/features/workspace/validation/workspace-schemas';

describe('createWorkspaceSchema', () => {
  it('trim le nom et accepte 2 à 120 caractères', () => {
    const result = createWorkspaceSchema.parse({ name: '  Mon espace  ' });
    expect(result).toEqual({ name: 'Mon espace' });
  });

  it('refuse un nom trop court après trim', () => {
    const result = createWorkspaceSchema.safeParse({ name: ' a ' });
    expect(result.success).toBe(false);
  });

  it('refuse un nom de plus de 120 caractères', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'a'.repeat(121) });
    expect(result.success).toBe(false);
  });
});
