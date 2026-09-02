import { toPublicUser } from './userPublic.dto.js';
import { updateCurrentUserProfile } from './user.service.js';

const updateMe = async (req, res) => {
    const user = await updateCurrentUserProfile({
        userId: req.user.id,
        firstName: req.validated.body.firstName,
        lastName: req.validated.body.lastName,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: toPublicUser(user),
        },
    });
};

export { updateMe };
