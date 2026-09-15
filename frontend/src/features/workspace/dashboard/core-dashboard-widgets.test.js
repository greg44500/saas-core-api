import { describe, expect, it } from 'vitest';

import { coreDashboardWidgets } from '@/features/workspace/dashboard/core-dashboard-widgets';
import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

describe('Core file surfaces', () => {
  it('ne traite plus le nombre de fichiers actifs comme un KPI de dashboard', () => {
    expect(
      coreDashboardWidgets.some((widget) => widget.id === 'core.files'),
    ).toBe(false);
  });

  it('conserve une seule entrée Fichiers dans la navigation Ressources', () => {
    const resources = coreWorkspaceNavigation.find(
      (entry) => entry.id === 'resources',
    );

    expect(resources?.items.map((item) => item.id)).toEqual(['files']);
  });
});
