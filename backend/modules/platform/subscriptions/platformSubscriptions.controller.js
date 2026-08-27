import {
    listPlatformSubscriptions,
} from './services/listPlatformSubscriptions.service.js';


/**
 * Retourne la liste administrative paginée des souscriptions.
 *
 * Le contrôleur reste limité au contrat HTTP. Le chargement et la pagination
 * sont délégués au service Platform dédié.
 */
const listSubscriptions = async (req, res) => {
    const {
        subscriptions,
        pagination,
    } = await listPlatformSubscriptions({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            subscriptions,
        },
        meta: pagination,
    });
};


export {
    listSubscriptions,
};