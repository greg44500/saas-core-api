import {
    Subscription,
} from '../../../subscriptions/subscription.model.js';


/**
 * Retourne les souscriptions visibles depuis l'administration Platform.
 *
 * La liste charge uniquement les informations Workspace et Plan nécessaires
 * à l'identification de la souscription. Les données administratives plus
 * détaillées restent réservées au futur endpoint de consultation individuelle.
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
        subscriptions,
        total,
    ] = await Promise.all([
        Subscription.find({})
            .populate({
                path: 'workspace',
                select: 'name',
            })
            .populate({
                path: 'plan',
                select: 'key name',
            })
            .sort({
                createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

        Subscription.countDocuments({}),
    ]);

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