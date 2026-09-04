import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

/**
 * Point de composition de la navigation Workspace.
 *
 * Une application dérivée ajoute ici les groupes déclarés par ses modules
 * métier. Le composant Sidebar reste générique et ne dépend d'aucun module
 * métier concret.
 */
const workspaceNavigation = [
  ...coreWorkspaceNavigation,
];

export { workspaceNavigation };
