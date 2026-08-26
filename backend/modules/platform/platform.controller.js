import {
    disablePlatformUser,
    enablePlatformUser,
    getPlatformUser,
    listPlatformUsers,
    updatePlatformUserRole,
} from './platform.service.js';

import { AppError } from '../../utils/appError.js';

/**
 * Retourne le détail administratif d'un utilisateur de la plateforme.
 *
 * L'authentification, l'autorisation plateforme et la validation
 * de userId sont effectuées en amont par les middlewares.
 */
const getUserById = async (req, res) => {
    const user = await getPlatformUser({
        userId: req.validated.params.userId,
    });

    if (!user) {
        throw new AppError(
            'Utilisateur introuvable',
            404,
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
};

/**
 * Retourne les utilisateurs de la plateforme avec pagination.
 *
 * L'authentification et l'autorisation plateforme sont vérifiées
 * en amont par les middlewares.
 *
 * Les paramètres de pagination proviennent exclusivement
 * des données validées par Zod.
 */
const listUsers = async (req, res) => {
    const {
        users,
        pagination,
    } = await listPlatformUsers({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            users,
        },
        meta: pagination,
    });
};

/**
 * Désactive un utilisateur de la plateforme.
 *
 * Les contrôles d'authentification, de rôle plateforme
 * et de validation sont déjà effectués par les middlewares.
 */
const disableUser = async (req, res) => {
    const user = await disablePlatformUser({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        disabledReason:
            req.validated.body.disabledReason,
        ipAddress: req.ip ?? null,
        userAgent:
            req.get('user-agent') ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
};

/**
 * Réactive un utilisateur précédemment désactivé.
 *
 * L'authentification, l'autorisation plateforme et la validation
 * de userId sont déjà prises en charge par les middlewares.
 */
const enableUser = async (req, res) => {
    const user = await enablePlatformUser({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        ipAddress: req.ip ?? null,
        userAgent:
            req.get('user-agent') ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
};

/**
 * Modifie le rôle global d'un utilisateur de la plateforme.
 *
 * L'authentification, l'autorisation et la validation des données
 * sont déjà effectuées par les middlewares Platform.
 */
const updateUserRole = async (req, res) => {
    const user = await updatePlatformUserRole({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        platformRole:
            req.validated.body.platformRole,
        ipAddress: req.ip ?? null,
        userAgent:
            req.get('user-agent') ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
};


export {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    updateUserRole,
};