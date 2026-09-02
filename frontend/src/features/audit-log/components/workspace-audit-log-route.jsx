import { WorkspaceAuditLogPage } from '@/features/audit-log/pages/workspace-audit-log-page';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

function WorkspaceAuditLogAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter l’historique d’activité de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceAuditLogRoute() {
  return (
    <WorkspacePermissionGate
      fallback={<WorkspaceAuditLogAccessDenied />}
      permission={WORKSPACE_PERMISSION.AUDIT_READ}
    >
      <WorkspaceAuditLogPage />
    </WorkspacePermissionGate>
  );
}

export { WorkspaceAuditLogAccessDenied, WorkspaceAuditLogRoute };
