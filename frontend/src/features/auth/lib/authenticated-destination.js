import { PLATFORM_ROLE } from '@/features/platform/constants/platform-roles';

const PLATFORM_HOME = '/platform/overview';
const WORKSPACE_HOME = '/workspaces';

const isPlatformSuperAdmin = (user) => (
  user?.platformRole === PLATFORM_ROLE.SUPER_ADMIN
);

/**
 * Retourne le contexte principal d'un utilisateur authentifié.
 *
 * Un `super_admin` administre d'abord la plateforme ; l'existence éventuelle
 * de memberships Workspace ne doit donc jamais faire de `/workspaces` son
 * accueil implicite. Les autres utilisateurs restent orientés vers leur
 * contexte tenant.
 */
function getAuthenticatedHome(user) {
  return isPlatformSuperAdmin(user) ? PLATFORM_HOME : WORKSPACE_HOME;
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
 * sauf lorsqu'elle ramènerait implicitement un `super_admin` dans le contexte
 * client Workspace. Dans ce cas, la console Platform redevient l'accueil ; un
 * Workspace pourra ensuite être ouvert volontairement depuis l'application.
 */
function resolveAuthenticatedDestination({ destination, user } = {}) {
  const requestedPath = toLocationPath(destination);

  if (
    requestedPath
    && !(isPlatformSuperAdmin(user) && isWorkspaceClientPath(destination.pathname))
  ) {
    return requestedPath;
  }

  return getAuthenticatedHome(user);
}

export {
  PLATFORM_HOME,
  WORKSPACE_HOME,
  getAuthenticatedHome,
  isPlatformSuperAdmin,
  isWorkspaceClientPath,
  resolveAuthenticatedDestination,
};
