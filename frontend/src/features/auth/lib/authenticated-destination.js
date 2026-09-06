import {
  getFirstPlatformDestination,
} from '@/features/platform/lib/platform-navigation';

const PLATFORM_HOME = '/platform/overview';
const WORKSPACE_HOME = '/workspaces';

/**
 * L'accueil authentifié ne dépend jamais de User.platformRole.
 * Le contexte Platform courant, résolu par le backend depuis PlatformTeamMember
 * et PlatformRole, est l'unique source permettant de privilégier la console.
 */
function getAuthenticatedHome(platformAccess) {
  return getFirstPlatformDestination(platformAccess) ?? WORKSPACE_HOME;
}

function isWorkspaceClientPath(pathname = '') {
  return pathname === '/workspaces'
    || pathname.startsWith('/workspaces/')
    || pathname === '/onboarding'
    || pathname.startsWith('/onboarding/');
}

function toLocationPath(destination) {
  if (!destination?.pathname) return null;

  return `${destination.pathname}${destination.search ?? ''}${destination.hash ?? ''}`;
}

/**
 * Une destination protégée mémorisée avant authentification reste prioritaire,
 * sauf lorsqu'elle ramènerait implicitement un membre Platform actif vers le
 * contexte client Workspace. Dans ce cas, la première destination Platform
 * réellement autorisée devient l'accueil ; un Workspace peut ensuite être
 * ouvert volontairement depuis l'application.
 */
function resolveAuthenticatedDestination({ destination, platformAccess } = {}) {
  const requestedPath = toLocationPath(destination);
  const platformDestination = getFirstPlatformDestination(platformAccess);

  if (
    requestedPath
    && !(platformDestination && isWorkspaceClientPath(destination.pathname))
  ) {
    return requestedPath;
  }

  return platformDestination ?? WORKSPACE_HOME;
}

export {
  PLATFORM_HOME,
  WORKSPACE_HOME,
  getAuthenticatedHome,
  isWorkspaceClientPath,
  resolveAuthenticatedDestination,
};
