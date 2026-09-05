import { describe, expect, it } from 'vitest';

import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';
import {
  composeWorkspaceNavigation,
} from '@/app/workspace-navigation';


describe('workspace navigation composition', () => {
  it('conserve la navigation Core et ajoute les groupes métier', () => {
    const catalogGroup = {
      key: 'catalog',
      label: 'Catalogue',
      items: [],
    };

    const navigation = composeWorkspaceNavigation([
      {
        groups: [catalogGroup],
      },
    ]);

    expect(navigation.slice(0, coreWorkspaceNavigation.length)).toEqual(
      coreWorkspaceNavigation,
    );
    expect(navigation).toContain(catalogGroup);
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
