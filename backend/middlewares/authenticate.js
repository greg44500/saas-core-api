import { User } from '../modules/users/user.model.js';
import { AppError } from '../utils/appError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { USER_STATUS } from '../constants/userStatus.constants.js';


/**
 * Authentifie une requête à partir d'un access token Bearer.
 *
 * Le JWT permet d'identifier le User, mais MongoDB reste la source
 * de vérité concernant l'état actuel du compte.
 */
export const authenticate = async (req, res, next) => {
    const authorizationHeader = req.get('authorization');

    if (!authorizationHeader?.startsWith('Bearer ')) {
        return next(
            new AppError(
                'Authentification requise',
                401,
            ),
        );
    }

    const token = authorizationHeader.slice(7);

    if (!token) {
        return next(
            new AppError(
                'Authentification requise',
                401,
            ),
        );
    }

    let payload;

    try {
        payload = verifyAccessToken(token);
    } catch {
        return next(
            new AppError(
                'Access token invalide ou expiré',
                401,
            ),
        );
    }

    const user = await User.findById(payload.sub);

    if (!user) {
        return next(
            new AppError(
                'Utilisateur introuvable',
                401,
            ),
        );
    }

    if (user.status === USER_STATUS.DISABLED) {
        return next(
            new AppError(
                'Compte désactivé',
                403,
            ),
        );
    }

    if (user.status === USER_STATUS.CLOSED) {
        return next(
            new AppError(
                'Compte clôturé',
                403,
            ),
        );
    }

    req.user = user;

    next();
};