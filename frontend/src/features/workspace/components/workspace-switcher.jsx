import { useNavigate, useParams } from 'react-router';

import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';

function WorkspaceSwitcher({ currentWorkspace }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { data: workspaces = [], isLoading, isFetching } = useListWorkspacesQuery();

  const includesCurrentWorkspace = workspaces.some(
    (workspace) => workspace.id === workspaceId,
  );
  const availableWorkspaces =
    currentWorkspace && !includesCurrentWorkspace
      ? [currentWorkspace, ...workspaces]
      : workspaces;

  function handleChange(event) {
    const nextWorkspaceId = event.target.value;

    if (!nextWorkspaceId || nextWorkspaceId === workspaceId) {
      return;
    }

    navigate(`/workspaces/${nextWorkspaceId}/dashboard`);
  }

  return (
    <label className="grid min-w-0 gap-1">
      <span className="sr-only">Espace de travail actif</span>
      <select
        aria-label="Espace de travail actif"
        className="h-9 w-full max-w-64 truncate rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={
          (isLoading || isFetching) && availableWorkspaces.length <= 1
            ? true
            : availableWorkspaces.length <= 1
        }
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
