import { useNavigate, useParams } from 'react-router';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const workspaceItems = availableWorkspaces.map((workspace) => ({
    value: workspace.id,
    label: workspace.name,
  }));

  function handleChange(nextWorkspaceId) {
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
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-sm text-muted-foreground">Espace de travail :</span>
      <Select
        items={workspaceItems}
        onValueChange={(nextWorkspaceId) => {
          if (typeof nextWorkspaceId === 'string') handleChange(nextWorkspaceId);
        }}
        value={workspaceId ?? null}
      >
        <SelectTrigger
          aria-label="Espace de travail actif"
          className="h-9 w-full max-w-64 font-medium shadow-sm"
        >
          <SelectValue placeholder="Sélectionner un espace de travail" />
        </SelectTrigger>
        <SelectContent>
          {availableWorkspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { WorkspaceSwitcher };
