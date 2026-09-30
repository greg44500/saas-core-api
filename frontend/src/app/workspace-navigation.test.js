import { describe, expect, it } from 'vitest';

import {
  composeWorkspaceNavigation,
} from '@/app/workspace-navigation';
import {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
} from '@/features/workspace/navigation/compose-workspace-navigation';
import {
  coreWorkspaceAdministrationNavigation,
  coreWorkspaceDashboardNavigationItem,
  coreWorkspaceNavigation,
} from '@/features/workspace/navigation/core-workspace-navigation';

describe('workspace navigation composition', () => {
  it('conserve la navigation Core plate lorsqu’aucun module applicatif n’est déclaré', () => {
    const navigation = composeWorkspaceNavigation([]);

    expect(navigation).toBe(coreWorkspaceNavigation);
    expect(navigation.every((entry) => entry.type === 'item')).toBe(true);
  });

  it('place le Dashboard avant les modules applicatifs puis sépare uniquement l’administration Core', () => {
    const catalogGroup = {
      id: 'catalog',
      type: 'group',
      label: 'Catalogue',
      items: [],
    };

    const navigation = composeWorkspaceNavigation([
      {
        groups: [catalogGroup],
      },
    ]);

    expect(navigation).toEqual([
      coreWorkspaceDashboardNavigationItem,
      catalogGroup,
      WORKSPACE_ADMINISTRATION_SEPARATOR,
      ...coreWorkspaceAdministrationNavigation,
    ]);
    expect(navigation[0].id).toBe('dashboard');
    expect(navigation[1]).toBe(catalogGroup);
    expect(navigation[2]).toBe(WORKSPACE_ADMINISTRATION_SEPARATOR);
    expect(WORKSPACE_ADMINISTRATION_SEPARATOR.label)
      .toBe('Administration de l’espace');
  });

  it('refuse un descriptor de navigation invalide', () => {
    expect(() => composeWorkspaceNavigation([
      {
        groups: 'catalog',
      },
    ])).toThrow(
      'navigationModules[0].groups must be an array',
    );
  });
});
