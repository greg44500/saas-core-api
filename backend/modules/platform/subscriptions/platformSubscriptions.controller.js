import {
    listPlatformSubscriptions,
} from './services/listPlatformSubscriptions.service.js';

import {
    getPlatformSubscriptionById,
} from './services/getPlatformSubscriptionById.service.js';

import {
    updatePlatformSubscription,
} from './services/updatePlatformSubscription.service.js';

import {
    cancelPlatformSubscription,
} from './services/cancelPlatformSubscription.service.js';

import {
    resumePlatformSubscription,
} from './services/resumePlatformSubscription.service.js';

import {
    grantTrial,
} from '../../subscriptions/services/grantTrial.service.js';


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
 * Accorde un trial commercial à un workspace ou change le plan d'un trial
 * déjà actif sans modifier son horloge.
 */
const grantSubscriptionTrial = async (req, res) => {
    const subscription = await grantTrial({
        workspaceId:
            req.validated.body.workspaceId,
        planId:
            req.validated.body.planId,
        billingInterval:
            req.validated.body.billingInterval,
        actorId:
            req.user._id,
        ipAddress:
            req.context?.ipAddress ?? null,
        userAgent:
            req.context?.userAgent ?? null,
    });

    /*
     * 200 est utilisé plutôt que 201 car la même opération peut soit créer
     * le premier trial, soit faire évoluer le plan d'un trial déjà en cours.
     */
    res.status(200).json({
        status: 'success',
        data: {
            subscription,
        },
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


/**
 * Annule une souscription immédiatement ou en fin de période.
 */
const cancelSubscription = async (req, res) => {
    const subscription =
        await cancelPlatformSubscription({
            subscriptionId:
                req.validated.params.subscriptionId,
            mode:
                req.validated.body.mode,
            reason:
                req.validated.body.reason,
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


/**
 * Retire une annulation programmée en fin de période.
 */
const resumeSubscription = async (req, res) => {
    const subscription =
        await resumePlatformSubscription({
            subscriptionId:
                req.validated.params.subscriptionId,
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
    grantSubscriptionTrial,
    getSubscriptionById,
    getPlatformSubscriptionById,
    updateSubscription,
    cancelSubscription,
    resumeSubscription,
};
