import {
  composeWorkspaceNavigation,
} from '@/features/workspace/navigation/compose-workspace-navigation';

/**
 * Point de composition de la navigation Workspace du produit dérivé.
 *
 * Les modules applicatifs sont déclarés ici. Le moteur de composition demeure
 * dans la feature Workspace Core afin qu'un dérivé n'ait pas à recopier sa
 * logique d'ordre, de séparation ou d'évolution du shell.
 */
const APPLICATION_WORKSPACE_NAVIGATION_MODULES = Object.freeze([]);

const workspaceNavigation = composeWorkspaceNavigation(
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
);

export {
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  composeWorkspaceNavigation,
  workspaceNavigation,
};
