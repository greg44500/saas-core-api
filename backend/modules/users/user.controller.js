import {
    refreshCookieName,
    refreshCookieOptions,
} from '../../config/cookie.config.js';
import { toPublicUser } from './userPublic.dto.js';
import { requestCurrentUserClosure } from './userClosure.service.js';
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

const requestClosure = async (req, res) => {
    const closure = await requestCurrentUserClosure({
        userId: req.user.id,
        currentPassword: req.validated.body.currentPassword,
        confirmationEmail: req.validated.body.confirmationEmail,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        data: {
            accountClosure: closure,
        },
    });
};

export {
    requestClosure,
    updateMe,
};
