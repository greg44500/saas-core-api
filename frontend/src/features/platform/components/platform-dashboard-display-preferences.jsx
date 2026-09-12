import { DashboardDisplayPreferences } from '@/components/shared/dashboard-display-preferences';
import { useGetCurrentUserPreferencesQuery } from '@/features/preferences/api/user-preferences-api';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  PLATFORM_DASHBOARD_WIDGETS,
  getAccessiblePlatformDashboardWidgets,
} from '@/features/platform/lib/platform-dashboard-preferences';

function PlatformDashboardDisplayPreferences({ triggerVariant = 'button' }) {
  const platformContextQuery = useGetCurrentPlatformContextQuery();
  const preferencesQuery = useGetCurrentUserPreferencesQuery();
  const accessibleWidgets = getAccessiblePlatformDashboardWidgets(
    PLATFORM_DASHBOARD_WIDGETS,
    platformContextQuery.data?.permissions ?? [],
  );

  return (
    <DashboardDisplayPreferences
      accessibleWidgets={accessibleWidgets}
      preferencesQuery={preferencesQuery}
      triggerVariant={triggerVariant}
    />
  );
}

export { PlatformDashboardDisplayPreferences };
