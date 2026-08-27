import {
    listPlatformSubscriptions,
} from './services/listPlatformSubscriptions.service.js';

import { getPlatformSubscriptionById } from './services/getPlatformSubscriptionById.service.js';


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

/**
 * Retourne le détail administratif d'une souscription.
 *
 * Le contrôleur délègue la résolution et la construction du DTO
 * au service Platform dédié.
 */
const getSubscriptionById = async (req, res) => {
    const subscription =
        await getPlatformSubscriptionById({
            subscriptionId:
                req.validated.params.subscriptionId,
        });

    res.status(200).json({
        status: 'success',
        data: {
            subscription,
        },
    });
};


export {
    listSubscriptions,
    getSubscriptionById,
    getPlatformSubscriptionById,
};