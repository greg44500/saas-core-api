import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';

function toPublicUser(user) {
    if (!user) {
        throw new TypeError('user is required to build the public auth DTO');
    }

    const id = user.id ?? user._id?.toString?.();
    const publicUser = {
        id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
    };

    /*
     * Le rôle plateforme n'est utile au frontend que lorsqu'il ouvre une
     * surface d'administration globale. Les comptes ordinaires conservent
     * ainsi le DTO public historique sans champ d'autorisation superflu.
     */
    if (user.platformRole === PLATFORM_ROLE.SUPER_ADMIN) {
        publicUser.platformRole = PLATFORM_ROLE.SUPER_ADMIN;
    }

    return publicUser;
}

export { toPublicUser };
