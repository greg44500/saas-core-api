import { AppError } from '../../../utils/appError.js';
import { disablePlatformUser } from './services/disablePlatformUser.service.js';
import { enablePlatformUser } from './services/enablePlatformUser.service.js';
import { getPlatformUser } from './services/getPlatformUser.service.js';
import { listPlatformUsers } from './services/listPlatformUsers.service.js';
import { revokePlatformUserSessions } from './services/revokePlatformUserSessions.service.js';
import { updatePlatformUserRole } from './services/updatePlatformUserRole.service.js';

const getUserById = async (req, res) => {
    const user = await getPlatformUser({
        userId: req.validated.params.userId,
    });

    if (!user) {
        throw new AppError('Utilisateur introuvable', 404);
    }

    res.status(200).json({ status: 'success', data: { user } });
};

const listUsers = async (req, res) => {
    const { users, pagination } = await listPlatformUsers({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: { users },
        meta: pagination,
    });
};

const disableUser = async (req, res) => {
    const user = await disablePlatformUser({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        disabledReason: req.validated.body.disabledReason,
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
    });

    res.status(200).json({ status: 'success', data: { user } });
};

const enableUser = async (req, res) => {
    const user = await enablePlatformUser({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
    });

    res.status(200).json({ status: 'success', data: { user } });
};

const updateUserRole = async (req, res) => {
    const user = await updatePlatformUserRole({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        platformRole: req.validated.body.platformRole,
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
    });

    res.status(200).json({ status: 'success', data: { user } });
};

const revokeUserSessions = async (req, res) => {
    const result = await revokePlatformUserSessions({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
    });

    res.status(200).json({ status: 'success', data: result });
};

export {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    revokeUserSessions,
    updateUserRole,
};
