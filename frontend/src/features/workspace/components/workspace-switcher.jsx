import { useNavigate, useParams } from 'react-router';

import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';

function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { data: workspaces = [], isLoading, isFetching } = useListWorkspacesQuery();

  function handleChange(event) {
    const nextWorkspaceId = event.target.value;

    if (!nextWorkspaceId || nextWorkspaceId === workspaceId) {
      return;
    }

    navigate(`/workspaces/${nextWorkspaceId}/dashboard`);
  }

  return (
    <label className="grid gap-1">
      <span className="sr-only">Espace de travail actif</span>
      <select
        aria-label="Espace de travail actif"
        className="h-9 max-w-64 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={isLoading || isFetching || workspaces.length === 0}
        onChange={handleChange}
        value={workspaceId ?? ''}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export { WorkspaceSwitcher };
