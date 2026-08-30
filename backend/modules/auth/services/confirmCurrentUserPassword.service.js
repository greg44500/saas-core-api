import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import { AppError } from '../../../utils/appError.js';
import {
    verifyPassword,
} from '../../../utils/password.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';


/**
 * Confirme l'identité d'un utilisateur authentifié en revérifiant son mot de
 * passe local courant avant une opération sensible.
 *
 * Le secret brut n'est ni persisté, ni audité, ni retourné. Un même message
 * public est utilisé lorsque l'identité locale est absente ou lorsque le mot
 * de passe est incorrect afin de ne pas exposer inutilement la configuration
 * d'authentification du compte.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.userId
 * @param {string} params.password
 * @returns {Promise<void>}
 */
const confirmCurrentUserPassword = async ({
    userId,
    password,
}) => {
    if (!userId || !password) {
        throw new TypeError(
            'userId and password are required to confirm the current user password',
        );
    }

    const authIdentity = await AuthIdentity.findOne({
        user: userId,
        provider: AUTH_PROVIDER.LOCAL,
    }).select('+passwordHash');

    if (!authIdentity) {
        throw new AppError(
            'Confirmation d’identité invalide',
            401,
        );
    }

    const passwordIsValid = await verifyPassword(
        password,
        authIdentity.passwordHash,
    );

    if (!passwordIsValid) {
        throw new AppError(
            'Confirmation d’identité invalide',
            401,
        );
    }
};


export { confirmCurrentUserPassword };
