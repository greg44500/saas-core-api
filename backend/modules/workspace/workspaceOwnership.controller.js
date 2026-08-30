import {
    transferWorkspaceOwnership,
} from './transferWorkspaceOwnership.service.js';


/**
 * Transfère la propriété du workspace courant.
 *
 * L'identité de l'acteur et le workspace proviennent exclusivement du contexte
 * authentifié. Le client fournit la cible, le rôle de déclassement de l'ancien
 * owner et son mot de passe courant comme confirmation renforcée.
 */
const transferOwnership = async (req, res) => {
    const {
        previousOwner,
        newOwner,
    } = await transferWorkspaceOwnership({
        workspaceId: req.workspace._id,
        newOwnerMemberId:
            req.validated.body.newOwnerMemberId,
        previousOwnerRoleId:
            req.validated.body.previousOwnerRoleId,
        currentPassword:
            req.validated.body.currentPassword,
        actorId: req.user.id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    return res.status(200).json({
        status: 'success',
        data: {
            ownership: {
                previousOwnerMemberId:
                    previousOwner._id.toString(),
                newOwnerMemberId:
                    newOwner._id.toString(),
            },
        },
    });
};


export { transferOwnership };
