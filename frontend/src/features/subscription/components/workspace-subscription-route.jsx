import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceSubscriptionPage } from '@/features/subscription/pages/workspace-subscription-page';

function SubscriptionAccessDenied() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Abonnement</h1>
      <p className="text-sm text-muted-foreground">
        Vous n’avez pas la permission de consulter l’abonnement de ce workspace.
      </p>
    </section>
  );
}

/**
 * Le gate améliore l'UX mais ne remplace pas l'autorisation backend
 * `subscription:read`, qui reste l'autorité de sécurité sur la ressource.
 */
function WorkspaceSubscriptionRoute() {
  return (
    <WorkspacePermissionGate
      fallback={<SubscriptionAccessDenied />}
      permission={WORKSPACE_PERMISSION.SUBSCRIPTION_READ}
    >
      <WorkspaceSubscriptionPage />
    </WorkspacePermissionGate>
  );
}

export { SubscriptionAccessDenied, WorkspaceSubscriptionRoute };
