import { AppError } from '../../utils/appError.js';

import {
    createWorkspace,
    listUserWorkspaces,
    listWorkspaceMembers,
    updateWorkspace,
} from './workspace.service.js';


/**
 * Crée un workspace pour l'utilisateur authentifié.
 *
 * Le nom provient des données validées par Zod.
 * L'identité du créateur provient exclusivement d'authenticate :
 * elle ne peut pas être choisie par le client.
 */
export const create = async (req, res) => {
    const workspace = await createWorkspace({
        name: req.validated.body.name,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(201).json({
        status: 'success',
        data: {
            workspace: {
                id: workspace._id.toString(),
                name: workspace.name,
                status: workspace.status,
                createdAt: workspace.createdAt,
                updatedAt: workspace.updatedAt,
            },
        },
    });
};

/**
 * Retourne les workspaces actuellement accessibles
 * à l'utilisateur authentifié.
 *
 * Le service applique les règles d'appartenance et de statut.
 * Le controller se limite à transmettre l'identité de l'utilisateur
 * et à construire la réponse HTTP.
 */
export const list = async (req, res) => {
    const workspaces = await listUserWorkspaces(
        req.user.id,
    );

    res.status(200).json({
        status: 'success',
        data: {
            workspaces,
        },
    });
};

/**
 * Retourne les membres visibles du workspace courant.
 *
 * Le contexte multi-tenant et la permission member:read
 * sont vérifiés par les middlewares avant ce controller.
 *
 * Le controller transmet uniquement les données validées
 * au service, puis construit le contrat HTTP.
 */
export const listMembers = async (req, res) => {
    const {
        members,
        pagination,
    } = await listWorkspaceMembers({
        workspaceId: req.workspace._id,
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            members,
        },
        meta: pagination,
    });
};

/**
 * Retourne le workspace courant déjà chargé par loadWorkspaceContext.
 *
 * Le middleware a déjà vérifié l'existence du workspace,
 * son statut, l'appartenance active de l'utilisateur
 * et la cohérence du rôle.
 */
export const getById = (req, res) => {
    const { workspace } = req;

    res.status(200).json({
        status: 'success',
        data: {
            workspace: {
                id: workspace._id.toString(),
                name: workspace.name,
                status: workspace.status,
                createdAt: workspace.createdAt,
                updatedAt: workspace.updatedAt,
            },
        },
    });
};


/**
 * Modifie le nom du workspace courant.
 *
 * L'autorisation a déjà été vérifiée par loadWorkspaceContext
 * et authorizePermission.
 *
 * Le service répète volontairement la contrainte status = active
 * au moment exact de l'écriture afin qu'une suspension administrative
 * concurrente ne puisse pas être contournée.
 */
export const update = async (req, res) => {
    const workspace = await updateWorkspace({
        workspaceId: req.workspace._id,
        name: req.validated.body.name,
        actorId: req.user.id,
    });

    /**
     * Le workspace pouvait être actif pendant loadWorkspaceContext
     * puis être suspendu avant l'écriture.
     *
     * Dans ce cas, le service ne modifie rien et retourne null.
     */
    if (!workspace) {
        throw new AppError(
            'Workspace indisponible',
            403,
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            workspace: {
                id: workspace._id.toString(),
                name: workspace.name,
                status: workspace.status,
                createdAt: workspace.createdAt,
                updatedAt: workspace.updatedAt,
            },
        },
    });
};