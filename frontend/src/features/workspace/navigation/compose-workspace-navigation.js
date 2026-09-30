import {
  coreWorkspaceAdministrationNavigation,
  coreWorkspaceNavigation,
  coreWorkspacePrimaryNavigation,
} from '@/features/workspace/navigation/core-workspace-navigation';

const WORKSPACE_ADMINISTRATION_SEPARATOR = Object.freeze({
  id: 'workspace-administration-separator',
  type: 'separator',
});

/**
 * Compose le shell Workspace sans connaître les modules métier.
 *
 * Le Dashboard reste le point d'entrée primaire. Les modules applicatifs
 * viennent ensuite, puis les surfaces d'administration génériques du Core.
 */
function composeWorkspaceNavigation(navigationModules = []) {
  if (!Array.isArray(navigationModules)) {
    throw new TypeError('navigationModules must be an array');
  }

  const applicationEntries = navigationModules.flatMap((moduleDefinition, index) => {
    if (
      moduleDefinition === null
      || Array.isArray(moduleDefinition)
      || typeof moduleDefinition !== 'object'
    ) {
      throw new TypeError(
        `Workspace navigation module at index ${index} must be an object`,
      );
    }

    const groups = moduleDefinition.groups ?? [];

    if (!Array.isArray(groups)) {
      throw new TypeError(
        `navigationModules[${index}].groups must be an array`,
      );
    }

    return groups;
  });

  if (applicationEntries.length === 0) {
    return coreWorkspaceNavigation;
  }

  return Object.freeze([
    ...coreWorkspacePrimaryNavigation,
    ...applicationEntries,
    WORKSPACE_ADMINISTRATION_SEPARATOR,
    ...coreWorkspaceAdministrationNavigation,
  ]);
}

export {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
  composeWorkspaceNavigation,
};
