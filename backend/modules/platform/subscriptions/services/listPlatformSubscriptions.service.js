import {
    Subscription,
} from '../../../subscriptions/subscription.model.js';


/**
 * Retourne les souscriptions visibles depuis l'administration Platform.
 *
 * Le service construit un DTO explicite afin que le contrat HTTP ne dépende
 * jamais de la forme interne du document Mongoose. La liste reste volontairement
 * plus compacte que le détail individuel et n'expose aucun identifiant provider
 * ni motif administratif détaillé.
 *
 * @param {object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @returns {Promise<{
 *     subscriptions: object[],
 *     pagination: object
 * }>}
 */
const listPlatformSubscriptions = async ({
    page,
    limit,
}) => {
    const skip = (page - 1) * limit;

    const [
        subscriptionDocuments,
        total,
    ] = await Promise.all([
        Subscription.find({})
            .select(
                '_id workspace plan kind status '
                + 'currentPeriodStart currentPeriodEnd trialEndsAt '
                + 'cancelAtPeriodEnd billingInterval currency '
                + 'priceExclTaxMinor manualOverride createdAt updatedAt',
            )
            .populate({
                path: 'workspace',
                select: '_id name',
            })
            .populate({
                path: 'plan',
                select: '_id key name',
            })
            .sort({
                createdAt: -1,
                _id: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

        Subscription.countDocuments({}),
    ]);

    const subscriptions = subscriptionDocuments.map((subscription) => ({
        id: subscription._id.toString(),
        workspace: subscription.workspace
            ? {
                id: subscription.workspace._id.toString(),
                name: subscription.workspace.name,
            }
            : null,
        plan: subscription.plan
            ? {
                id: subscription.plan._id.toString(),
                key: subscription.plan.key,
                name: subscription.plan.name,
            }
            : null,
        kind: subscription.kind,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        trialEndsAt: subscription.trialEndsAt ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        billingInterval: subscription.billingInterval,
        currency: subscription.currency,
        priceExclTaxMinor: subscription.priceExclTaxMinor,
        manualOverride: subscription.manualOverride,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
    }));

    return {
        subscriptions,
        pagination: {
            page,
            limit,
            total,
            totalPages:
                Math.ceil(total / limit),
        },
    };
};


export {
    listPlatformSubscriptions,
};
