import { WorkspaceFeatureGate } from '@/features/workspace/components/workspace-feature-gate';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceRolesPage } from '@/features/workspace-roles/pages/workspace-roles-page';

function WorkspaceRolesAccessDenied() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les rôles et permissions de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceTeamManagementUnavailable() {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">Fonctionnalité indisponible</h1>
      <p className="text-sm text-muted-foreground">
        La gestion d’équipe n’est pas incluse dans l’offre effective de ce workspace.
      </p>
    </section>
  );
}

function WorkspaceRolesRoute() {
  return (
    <WorkspaceFeatureGate
      fallback={<WorkspaceTeamManagementUnavailable />}
      feature={WORKSPACE_FEATURE.TEAM_MANAGEMENT}
    >
      <WorkspacePermissionGate
        fallback={<WorkspaceRolesAccessDenied />}
        permission={WORKSPACE_PERMISSION.ROLE_READ}
      >
        <WorkspaceRolesPage />
      </WorkspacePermissionGate>
    </WorkspaceFeatureGate>
  );
}

export {
  WorkspaceRolesAccessDenied,
  WorkspaceRolesRoute,
  WorkspaceTeamManagementUnavailable,
};
