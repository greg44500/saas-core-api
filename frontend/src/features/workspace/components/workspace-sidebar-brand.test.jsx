import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';

describe('WorkspaceSidebar application identity', () => {
  it('affiche le nom de l’application à la place du workspace', () => {
    const workspace = { id: 'workspace-1', name: 'Acme' };

    render(
      <MemoryRouter initialEntries={['/workspaces/workspace-1/dashboard']}>
        <WorkspaceProvider
          features={[]}
          membership={null}
          permissions={[]}
          workspace={workspace}
        >
          <WorkspaceSidebar
            collapsed={false}
            navigation={[]}
            onToggle={vi.fn()}
            workspace={workspace}
          />
        </WorkspaceProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('SaaS Core')).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
  });
});
