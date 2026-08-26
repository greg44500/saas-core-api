/**
 * Façade publique du domaine Platform.
 *
 * Les controllers disposent d'un point d'import stable tandis que
 * chaque workflow administratif reste isolé dans son propre service.
 */

export {
    listPlatformUsers,
} from './services/listPlatformUsers.service.js';

export {
    getPlatformUser,
} from './services/getPlatformUser.service.js';

export {
    disablePlatformUser,
} from './services/disablePlatformUser.service.js';

export {
    enablePlatformUser,
} from './services/enablePlatformUser.service.js';

export {
    updatePlatformUserRole,
} from './services/updatePlatformUserRole.service.js';