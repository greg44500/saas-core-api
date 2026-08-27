import { User } from '../../../users/user.model.js';


/**
 * Retourne les utilisateurs de la plateforme avec pagination.
 *
 * Ce service est volontairement indépendant du rôle de l'acteur :
 * l'autorisation d'accès à cette opération appartient à la couche HTTP.
 */
const listPlatformUsers = async ({
    page = 1,
    limit = 20,
}) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError(
            'page must be an integer greater than or equal to 1',
        );
    }

    if (
        !Number.isInteger(limit)
        || limit < 1
        || limit > 100
    ) {
        throw new TypeError(
            'limit must be an integer between 1 and 100',
        );
    }

    const skip = (page - 1) * limit;

    const [userDocuments, total] = await Promise.all([
        User.find({})
            .select(
                '_id firstName lastName email '
                + 'status platformRole '
                + 'emailVerifiedAt lastLoginAt '
                + 'createdAt updatedAt',
            )
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments({}),
    ]);

    const users = userDocuments.map((user) => ({
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        platformRole: user.platformRole,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }));

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export { listPlatformUsers };
