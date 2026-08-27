import {
    listPlatformSubscriptions,
} from './services/listPlatformSubscriptions.service.js';

import {
    getPlatformSubscriptionById
} from './services/getPlatformSubscriptionById.service.js';

import {
    updatePlatformSubscription,
} from './services/updatePlatformSubscription.service.js';


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

/**
 * Met à jour les propriétés administratives autorisées d'une souscription.
 */
const updateSubscription = async (req, res) => {
    const subscription =
        await updatePlatformSubscription({
            subscriptionId:
                req.validated.params.subscriptionId,
            subscriptionData:
                req.validated.body,
            actorId:
                req.user._id,
            ipAddress:
                req.context?.ipAddress ?? null,
            userAgent:
                req.context?.userAgent ?? null,
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
    updateSubscription,
};