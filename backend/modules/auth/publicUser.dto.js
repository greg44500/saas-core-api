function toPublicUser(user) {
    if (!user) {
        throw new TypeError('user is required to build the public auth DTO');
    }

    const id = user.id ?? user._id?.toString?.();

    return {
        id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        platformRole: user.platformRole,
    };
}

export { toPublicUser };
