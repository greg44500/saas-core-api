import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceMembersPage } from '@/features/workspace-members/pages/workspace-members-page';

function WorkspaceMembersAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les membres de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceMembersRoute() {
  return (
    <WorkspacePermissionGate
      permission={WORKSPACE_PERMISSION.MEMBER_READ}
      fallback={<WorkspaceMembersAccessDenied />}
    >
      <WorkspaceMembersPage />
    </WorkspacePermissionGate>
  );
}

export { WorkspaceMembersAccessDenied, WorkspaceMembersRoute };
