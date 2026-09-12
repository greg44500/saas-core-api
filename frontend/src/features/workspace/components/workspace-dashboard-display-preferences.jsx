import { DashboardDisplayPreferences } from '@/components/shared/dashboard-display-preferences';
import { useWorkspaceDashboardWidgets } from '@/features/workspace/hooks/use-workspace-dashboard-widgets';

function WorkspaceDashboardDisplayPreferences({ triggerVariant = 'button' }) {
  const { accessibleWidgets, preferencesQuery } = useWorkspaceDashboardWidgets();

  return (
    <DashboardDisplayPreferences
      accessibleWidgets={accessibleWidgets}
      preferencesQuery={preferencesQuery}
      triggerVariant={triggerVariant}
    />
  );
}

export { WorkspaceDashboardDisplayPreferences };
