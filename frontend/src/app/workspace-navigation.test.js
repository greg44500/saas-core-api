import { describe, expect, it } from 'vitest';

import {
  composeWorkspaceNavigation,
} from '@/app/workspace-navigation';
import {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
} from '@/features/workspace/navigation/compose-workspace-navigation';
import {
  coreWorkspaceAdministrationNavigation,
  coreWorkspaceNavigation,
  coreWorkspacePrimaryNavigation,
} from '@/features/workspace/navigation/core-workspace-navigation';

describe('workspace navigation composition', () => {
  it('conserve la navigation Core plate lorsqu’aucun module applicatif n’est déclaré', () => {
    const navigation = composeWorkspaceNavigation([]);

    expect(navigation).toBe(coreWorkspaceNavigation);
    expect(navigation.every((entry) => entry.type === 'item')).toBe(true);
  });

  it('place le Dashboard, puis les modules applicatifs, puis l’administration Core', () => {
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
      ...coreWorkspacePrimaryNavigation,
      catalogGroup,
      WORKSPACE_ADMINISTRATION_SEPARATOR,
      ...coreWorkspaceAdministrationNavigation,
    ]);
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
