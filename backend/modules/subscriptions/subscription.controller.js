import {
    getWorkspaceSubscriptionOverview,
} from './services/getWorkspaceSubscriptionOverview.service.js';

/**
 * Retourne l'état d'abonnement utile à l'administration du workspace.
 *
 * L'autorisation est résolue avant ce controller. Le service retourne déjà un
 * DTO explicitement filtré afin que la couche HTTP n'ait jamais à manipuler ou
 * masquer elle-même des champs de paiement.
 */
const getWorkspaceOverview = async (req, res) => {
    const subscription = await getWorkspaceSubscriptionOverview({
        workspaceId: req.workspace._id,
    });

    res.status(200).json({
        status: 'success',
        data: {
            subscription,
        },
    });
};

export { getWorkspaceOverview };