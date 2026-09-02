import { WorkspaceFilesPage } from '@/features/files/pages/workspace-files-page';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

function WorkspaceFilesAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les fichiers de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceFilesRoute() {
  return (
    <WorkspacePermissionGate
      fallback={<WorkspaceFilesAccessDenied />}
      permission={WORKSPACE_PERMISSION.FILE_READ}
    >
      <WorkspaceFilesPage />
    </WorkspacePermissionGate>
  );
}

export { WorkspaceFilesAccessDenied, WorkspaceFilesRoute };
