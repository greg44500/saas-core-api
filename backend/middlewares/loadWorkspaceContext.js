import { WORKSPACE_STATUS } from '../constants/workspace.constants.js';
import { WORKSPACE_MEMBER_STATUS } from '../constants/workspaceMember.constants.js';

import { Role } from '../modules/role/role.model.js';
import { Workspace } from '../modules/workspace/workspace.model.js';
import { WorkspaceMember } from '../modules/workspaceMember/workspaceMember.model.js';

import { AppError } from '../utils/AppError.js';


/**
 * Charge le contexte d'autorisation d'un workspace pour l'utilisateur connecté.
 *
 * Ce middleware intervient après authenticate :
 * req.user doit donc déjà contenir le User authentifié.
 *
 * Il ne gère que l'accès tenant aux routes /api/workspaces/:workspaceId/*.
 * Les accès d'administration globale de la plateforme utiliseront un mécanisme
 * distinct basé sur User.platformRole et authorizePlatformRole.
 */
const loadWorkspaceContext = async (req, res, next) => {
    const { workspaceId } = req.params;

    /**
     * Le Workspace représente la frontière multi-tenant.
     *
     * Le format de workspaceId devra être validé par Zod avant ce middleware
     * lorsque la route utilise un schéma de paramètres.
     */
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
        return next(
            new AppError(
                'Workspace introuvable',
                404,
            ),
        );
    }

    /**
     * Le statut administratif du workspace prime sur les permissions
     * éventuellement accordées à ses membres.
     *
     * Un workspace qui n'est plus actif n'est donc pas accessible depuis
     * les routes tenant, même pour son owner.
     *
     * Le super_admin plateforme ne passe pas par ce middleware lorsqu'il
     * administre le workspace depuis les futures routes /api/platform/*.
     */
    if (workspace.status !== WORKSPACE_STATUS.ACTIVE) {
        return next(
            new AppError(
                'Workspace indisponible',
                403,
            ),
        );
    }

    /**
     * L'authentification globale du User ne lui donne aucun droit automatique
     * dans ce workspace.
     *
     * Seule une appartenance active permet de construire le contexte
     * d'autorisation du tenant.
     */
    const membership = await WorkspaceMember.findOne({
        workspace: workspace._id,
        user: req.user._id,
        status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    });

    if (!membership) {
        return next(
            new AppError(
                'Accès au workspace interdit',
                403,
            ),
        );
    }

    /**
     * Le rôle référencé par le membership doit appartenir au même workspace.
     *
     * Cette condition protège la cohérence de la chaîne :
     *
     * User
     * → WorkspaceMember
     * → Role
     * → permissions
     */
    const role = await Role.findOne({
        _id: membership.role,
        workspace: workspace._id,
    });

    if (!role) {
        return next(
            new AppError(
                'Rôle du membre introuvable',
                403,
            ),
        );
    }

    /**
     * Le contexte est maintenant fiable et peut être consommé par les
     * middlewares suivants, notamment le futur authorizePermission.
     */
    req.workspace = workspace;
    req.membership = membership;
    req.role = role;
    req.permissions = role.permissions;

    next();
};


export { loadWorkspaceContext };