import { useNavigate, useParams } from 'react-router';

import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';

function WorkspaceSwitcher({ currentWorkspace }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { data: workspaces = [] } = useListWorkspacesQuery();

  const includesCurrentWorkspace = workspaces.some(
    (workspace) => workspace.id === workspaceId,
  );
  const availableWorkspaces =
    currentWorkspace && !includesCurrentWorkspace
      ? [currentWorkspace, ...workspaces]
      : workspaces;
  const activeWorkspace = availableWorkspaces.find(
    (workspace) => workspace.id === workspaceId,
  ) ?? currentWorkspace;

  function handleChange(event) {
    const nextWorkspaceId = event.target.value;

    if (!nextWorkspaceId || nextWorkspaceId === workspaceId) {
      return;
    }

    navigate(`/workspaces/${nextWorkspaceId}/dashboard`);
  }

  if (availableWorkspaces.length <= 1) {
    return (
      <p className="truncate text-sm text-foreground">
        <span className="text-muted-foreground">Espace de travail :</span>{' '}
        <span className="font-semibold">{activeWorkspace?.name ?? 'Workspace'}</span>
      </p>
    );
  }

  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-sm text-muted-foreground">Espace de travail :</span>
      <select
        aria-label="Espace de travail actif"
        className="h-9 w-full max-w-64 truncate rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={handleChange}
        value={workspaceId ?? ''}
      >
        {availableWorkspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export { WorkspaceSwitcher };
