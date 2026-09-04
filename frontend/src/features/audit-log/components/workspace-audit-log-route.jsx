import { WorkspaceAuditLogPage } from '@/features/audit-log/pages/workspace-audit-log-page';
import { WorkspaceFeatureGate } from '@/features/workspace/components/workspace-feature-gate';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
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

function WorkspaceAuditLogsUnavailable() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Fonctionnalité indisponible</h1>
      <p className="text-sm text-muted-foreground">
        L’historique d’activité n’est pas inclus dans l’offre effective de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceAuditLogRoute() {
  return (
    <WorkspaceFeatureGate
      fallback={<WorkspaceAuditLogsUnavailable />}
      feature={WORKSPACE_FEATURE.AUDIT_LOGS}
    >
      <WorkspacePermissionGate
        fallback={<WorkspaceAuditLogAccessDenied />}
        permission={WORKSPACE_PERMISSION.AUDIT_READ}
      >
        <WorkspaceAuditLogPage />
      </WorkspacePermissionGate>
    </WorkspaceFeatureGate>
  );
}

export {
  WorkspaceAuditLogAccessDenied,
  WorkspaceAuditLogRoute,
  WorkspaceAuditLogsUnavailable,
};
