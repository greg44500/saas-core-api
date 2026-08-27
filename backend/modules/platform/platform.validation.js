/**
 * Façade de compatibilité des validations Platform.
 * Les schémas réels vivent désormais dans leurs sous-domaines respectifs.
 */
export {
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    updatePlatformUserRoleBodySchema,
} from './users/platformUsers.validation.js';

export {
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema,
} from './workspaces/platformWorkspaces.validation.js';
