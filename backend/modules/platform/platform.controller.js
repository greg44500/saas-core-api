/**
 * Façade de compatibilité du module Platform.
 *
 * La logique HTTP est désormais organisée par sous-domaines.
 * Ce fichier conserve temporairement les anciens imports des tests
 * et consommateurs internes pendant la migration structurelle.
 */
export {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    revokeUserSessions,
    updateUserRole,
} from './users/platformUsers.controller.js';

export {
    getWorkspaceById,
    listWorkspaces,
    reactivateWorkspace,
    suspendWorkspace,
} from './workspaces/platformWorkspaces.controller.js';
