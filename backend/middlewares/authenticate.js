import { User } from '../modules/users/user.model.js';
import { AppError } from '../utils/appError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { USER_STATUS } from '../constants/userStatus.constants.js';


/**
 * Authentifie une requête à partir d'un access token Bearer.
 *
 * Le JWT prouve uniquement qu'un token a été signé par l'application et permet
 * d'identifier le User ciblé. MongoDB reste la source de vérité concernant
 * l'existence du compte, son statut courant et l'instant du dernier changement
 * de mot de passe.
 *
 * Le middleware applique donc une validation en deux temps :
 * 1. vérification cryptographique et temporelle du JWT ;
 * 2. revalidation de l'état courant du User en base.
 *
 * Un changement de mot de passe invalide les anciens access tokens via
 * `passwordChangedAt`, sans dépendre uniquement de leur expiration naturelle.
 * Les comptes désactivés, en fermeture ou clôturés restent refusés même si le
 * token présenté est encore cryptographiquement valide.
 *
 * En cas de succès, `req.user` devient le User rechargé depuis MongoDB. Ce
 * contexte doit être établi avant les middlewares d'autorisation Platform ou
 * workspace. Le middleware n'accorde lui-même aucune permission tenant ou
 * plateforme.
 *
 * Le comportement est fail-closed : toute incohérence entre le token et l'état
 * courant du compte provoque un refus.
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

    if (user.status === USER_STATUS.DELETION_REQUESTED) {
        return next(
            new AppError(
                'Fermeture du compte en cours',
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

    /*
     * La date contenue dans le token doit correspondre exactement
     * à l'état actuel du User.
     *
     * Après un changement de mot de passe :
     * - les anciens tokens ne contiennent pas cette date, ou contiennent
     *   une valeur précédente ;
     * - les nouveaux tokens contiennent la valeur actuellement stockée.
     */
    const userPasswordChangedAt =
        user.passwordChangedAt?.getTime() ?? null;

    const tokenPasswordChangedAt =
        Number.isSafeInteger(
            payload.passwordChangedAt,
        )
            ? payload.passwordChangedAt
            : null;

    if (
        tokenPasswordChangedAt
        !== userPasswordChangedAt
    ) {
        return next(
            new AppError(
                'Access token invalide ou expiré',
                401,
            ),
        );
    }

    req.user = user;

    next();
};