import {
  applicationDashboardWidgets,
  getAccessibleDashboardWidgets,
  getVisibleDashboardWidgets,
} from '@/app/application-dashboard';
import { useGetCurrentUserPreferencesQuery } from '@/features/preferences/api/user-preferences-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function useWorkspaceDashboardWidgets() {
  const { can, hasFeature, workspace } = useWorkspaceContext();
  const preferencesQuery = useGetCurrentUserPreferencesQuery();
  const accessibleWidgets = getAccessibleDashboardWidgets(
    applicationDashboardWidgets,
    { can, hasFeature },
  );
  const isPreferencesLoading = preferencesQuery.data === undefined
    && (preferencesQuery.isLoading || preferencesQuery.isFetching);
  const hiddenWidgetIds = preferencesQuery.data?.dashboard?.hiddenWidgetIds ?? [];

  /*
   * Tant que la préférence personnelle n'est pas connue, les widgets
   * configurables ne sont pas montés : une ancienne préférence de masquage ne
   * doit pas déclencher brièvement leurs requêtes serveur avant d'être chargée.
   * En cas d'échec de la préférence, le fallback reste le Dashboard accessible
   * complet afin qu'un incident de confort ne bloque pas l'usage métier.
   */
  const visibleWidgets = isPreferencesLoading
    ? accessibleWidgets.filter((widget) => !widget.configurable)
    : getVisibleDashboardWidgets(accessibleWidgets, hiddenWidgetIds);

  return {
    workspace,
    accessibleWidgets,
    visibleWidgets,
    preferencesQuery,
    isPreferencesLoading,
  };
}

export { useWorkspaceDashboardWidgets };
