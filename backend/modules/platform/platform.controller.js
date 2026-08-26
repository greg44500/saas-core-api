import {
    disablePlatformUser,
    enablePlatformUser,
    getPlatformUser,
    listPlatformUsers,
    updatePlatformUserRole,
    revokePlatformUserSessions,
    listPlatformWorkspaces,
    getPlatformWorkspace,
    suspendPlatformWorkspace,
    reactivatePlatformWorkspace,
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

/**
 * Révoque administrativement toutes les sessions actives
 * d'un utilisateur de la plateforme.
 *
 * L'authentification, l'autorisation et la validation de userId
 * sont déjà prises en charge par les middlewares Platform.
 */
const revokeUserSessions = async (req, res) => {
    const result = await revokePlatformUserSessions({
        userId: req.validated.params.userId,
        actorId: req.user._id,
        ipAddress: req.ip ?? null,
        userAgent:
            req.get('user-agent') ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const listWorkspaces = async (req, res) => {
    const {
        workspaces,
        pagination,
    } = await listPlatformWorkspaces({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            workspaces,
        },
        meta: pagination,
    });
};

/**
 * Retourne le détail administratif d'un workspace.
 *
 * Le service retourne null lorsque le workspace n'existe pas afin de rester
 * indépendant du protocole HTTP. Le controller traduit ici cette absence en
 * réponse 404, ce qui appartient à sa responsabilité de couche HTTP.
 *
 * L'autorisation Platform et la validation du workspaceId sont appliquées
 * en amont par la route.
 */

const getWorkspaceById = async (req, res) => {
    const workspace = await getPlatformWorkspace({
        workspaceId:
            req.validated.params.workspaceId,
    });

    if (!workspace) {
        return res.status(404).json({
            status: 'fail',
            message: 'Workspace introuvable',
        });
    }

    return res.status(200).json({
        status: 'success',
        data: {
            workspace,
        },
    });
};

/**
 * Suspend administrativement un workspace.
 *
 * La validation du workspaceId et du motif de suspension est réalisée
 * en amont par la route. Le controller se limite donc à traduire
 * la requête HTTP en appel de service puis à formater la réponse.
 *
 * Les informations de contexte de requête sont transmises au service
 * afin que l'action soit correctement attribuée dans l'AuditLog.
 */
const suspendWorkspace = async (req, res) => {
    const workspace =
        await suspendPlatformWorkspace({
            workspaceId:
                req.validated.params.workspaceId,
            actorId:
                req.user.id,
            statusReason:
                req.validated.body.statusReason,
            statusReasonDetails:
                req.validated.body
                    .statusReasonDetails
                ?? null,
            ipAddress:
                req.context?.ipAddress
                ?? null,
            userAgent:
                req.context?.userAgent
                ?? null,
        });

    return res.status(200).json({
        status: 'success',
        data: {
            workspace,
        },
    });
};

/**
 * Réactive administrativement un workspace suspendu.
 *
 * Le workspaceId est validé en amont par la route.
 * Le controller transmet également le contexte de requête afin que
 * l'action soit correctement attribuée dans l'AuditLog.
 *
 * La logique métier de transition SUSPENDED → ACTIVE reste entièrement
 * dans le service.
 */
const reactivateWorkspace = async (req, res) => {
    const workspace =
        await reactivatePlatformWorkspace({
            workspaceId:
                req.validated.params.workspaceId,
            actorId:
                req.user.id,
            ipAddress:
                req.context?.ipAddress
                ?? null,
            userAgent:
                req.context?.userAgent
                ?? null,
        });

    return res.status(200).json({
        status: 'success',
        data: {
            workspace,
        },
    });
};


export {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    updateUserRole,
    revokeUserSessions,
    listWorkspaces,
    getWorkspaceById,
    suspendWorkspace,
    reactivateWorkspace
};