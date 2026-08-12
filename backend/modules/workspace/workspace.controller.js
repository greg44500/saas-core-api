import { createWorkspace } from './workspace.service.js';


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