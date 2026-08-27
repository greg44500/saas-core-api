/**
 * Façade de compatibilité des services Platform.
 * Les implémentations sont désormais regroupées par sous-domaines.
 */
export { listPlatformUsers } from './users/services/listPlatformUsers.service.js';
export { getPlatformUser } from './users/services/getPlatformUser.service.js';
export { disablePlatformUser } from './users/services/disablePlatformUser.service.js';
export { enablePlatformUser } from './users/services/enablePlatformUser.service.js';
export { updatePlatformUserRole } from './users/services/updatePlatformUserRole.service.js';
export { revokePlatformUserSessions } from './users/services/revokePlatformUserSessions.service.js';

export { listPlatformWorkspaces } from './workspaces/services/listPlatformWorkspaces.service.js';
export { getPlatformWorkspace } from './workspaces/services/getPlatformWorkspace.service.js';
export { suspendPlatformWorkspace } from './workspaces/services/suspendPlatformWorkspace.service.js';
export { reactivatePlatformWorkspace } from './workspaces/services/reactivatePlatformWorkspace.service.js';
