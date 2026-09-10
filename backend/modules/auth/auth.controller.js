import {
    refreshCookieName,
    refreshCookieOptions,
} from '../../config/cookie.config.js';
import { getPublicPasswordPolicy } from '../../shared/security/passwordPolicy.js';

import { revokeCurrentAuthSession, rotateAuthSession, revokeAllUserAuthSessions, } from '../authSessions/authSession.service.js';

import {
    changeUserPassword,
    forgotUserPassword,
    loginUser,
    registerUser,
    resetUserPassword,
} from './auth.service.js';
import { toPublicUser } from './publicUser.dto.js';

import { signAccessToken } from '../../utils/jwt.js';

export const passwordPolicy = async (_req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            passwordPolicy: getPublicPasswordPolicy(),
        },
    });
};

export const register = async (req, res) => {
    const user = await registerUser({
        ...req.validated.body,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(201).json({
        status: 'success',
        data: {
            user: toPublicUser(user),
        },
    });
};

export const login = async (req, res) => {
    const {
        user,
        refreshToken,
    } = await loginUser({
        ...req.validated.body,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const accessToken = signAccessToken(
        String(user._id),
        user.passwordChangedAt ?? null,
    );

    res.cookie(
        refreshCookieName,
        refreshToken,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        data: {
            user: toPublicUser(user),
            accessToken,
        },
    });
};

export const forgotPassword = async (req, res) => {
    const { message } = await forgotUserPassword({
        email: req.validated.body.email,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        message,
    });
};

export const resetPassword = async (req, res) => {
    await resetUserPassword({
        token: req.validated.body.token,
        newPassword:
            req.validated.body.newPassword,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        message:
            'Mot de passe réinitialisé avec succès.',
    });
};

export const refresh = async (req, res) => {
    const currentRefreshToken =
        req.cookies?.[refreshCookieName];

    const {
        user,
        refreshToken: nextRefreshToken,
    } = await rotateAuthSession({
        refreshToken: currentRefreshToken,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const accessToken = signAccessToken(
        String(user._id),
        user.passwordChangedAt ?? null,
    );

    res.cookie(
        refreshCookieName,
        nextRefreshToken,
        refreshCookieOptions,
    );

    res.status(200).json({
        status: 'success',
        data: {
            user: toPublicUser(user),
            accessToken,
        },
    });
};

export const logout = async (req, res) => {
    const currentRefreshToken =
        req.cookies?.[refreshCookieName];

    await revokeCurrentAuthSession({
        refreshToken: currentRefreshToken,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

export const logoutAll = async (req, res) => {
    await revokeAllUserAuthSessions({
        userId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

export const changePassword = async (req, res) => {
    await changeUserPassword({
        userId: req.user.id,
        currentPassword:
            req.validated.body.currentPassword,
        newPassword:
            req.validated.body.newPassword,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.clearCookie(
        refreshCookieName,
        refreshCookieOptions,
    );

    res.status(204).send();
};

export const me = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: toPublicUser(req.user),
        },
    });
};
