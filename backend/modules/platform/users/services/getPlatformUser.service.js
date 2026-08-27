import { User } from '../../../users/user.model.js';

const getPlatformUser = async ({ userId }) => {
    if (!userId) {
        throw new TypeError(
            'userId is required to get a platform user',
        );
    }

    const user = await User.findById(userId)
        .select(
            '_id firstName lastName email '
            + 'status platformRole '
            + 'emailVerifiedAt passwordChangedAt '
            + 'lastLoginAt disabledAt disabledReason '
            + 'deletionRequestedAt closedAt closureReason '
            + 'createdAt updatedAt',
        )
        .lean();

    if (!user) return null;

    return {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        platformRole: user.platformRole,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        passwordChangedAt: user.passwordChangedAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        disabledAt: user.disabledAt ?? null,
        disabledReason: user.disabledReason ?? null,
        deletionRequestedAt: user.deletionRequestedAt ?? null,
        closedAt: user.closedAt ?? null,
        closureReason: user.closureReason ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

export { getPlatformUser };
