import { WorkspaceFileTrashPage } from '@/features/files/pages/workspace-file-trash-page';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

function WorkspaceFileTrashAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter la corbeille de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceFileTrashRoute() {
  return (
    <WorkspacePermissionGate
      fallback={<WorkspaceFileTrashAccessDenied />}
      permission={WORKSPACE_PERMISSION.FILE_TRASH_READ}
    >
      <WorkspaceFileTrashPage />
    </WorkspacePermissionGate>
  );
}

export { WorkspaceFileTrashAccessDenied, WorkspaceFileTrashRoute };
