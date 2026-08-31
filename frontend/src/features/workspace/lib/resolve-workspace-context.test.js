import { describe, expect, it } from 'vitest';

import { resolveWorkspaceContext } from '@/features/workspace/lib/resolve-workspace-context';

describe('resolveWorkspaceContext', () => {
  it('oriente vers onboarding sans workspace', () => {
    expect(resolveWorkspaceContext([])).toEqual({ type: 'onboarding' });
  });

  it('oriente directement vers le seul workspace disponible', () => {
    expect(resolveWorkspaceContext([{ id: 'workspace-1' }])).toEqual({
      type: 'workspace',
      workspaceId: 'workspace-1',
    });
  });

  it('demande un choix explicite avec plusieurs workspaces', () => {
    const workspaces = [{ id: 'workspace-1' }, { id: 'workspace-2' }];
    expect(resolveWorkspaceContext(workspaces)).toEqual({
      type: 'selection',
      workspaces,
    });
  });
});
