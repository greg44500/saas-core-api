/*
 * Façade publique du domaine Auth.
 *
 * Les controllers conservent un point d'import stable tandis que chaque
 * workflow reste isolé dans un service responsable d'un seul cas d'usage.
 */
export {
    changeUserPassword,
} from './services/changeUserPassword.service.js';

export {
    forgotUserPassword,
} from './services/forgotUserPassword.service.js';

export {
    loginUser,
} from './services/loginUser.service.js';

export {
    registerUser,
} from './services/registerUser.service.js';

export {
    resetUserPassword,
} from './services/resetUserPassword.service.js';