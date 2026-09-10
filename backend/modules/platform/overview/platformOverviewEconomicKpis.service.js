import {
    COMMERCIAL_INVITATION_STATUS,
} from '../../../constants/commercialInvitation.constants.js';
import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_TERM_TYPE,
} from '../../../constants/subscription.constants.js';
import { CommercialInvitation } from '../../commercialInvitation/commercialInvitation.model.js';
import { Subscription } from '../../subscriptions/subscription.model.js';

const countFacet = (facet) => facet?.[0]?.count ?? 0;

/**
 * Résout une seule Subscription économiquement effective par workspace avec la
 * même priorité que l'entitlement runtime : commercial active, trial valide,
 * puis baseline. Les branches commerciales invalides ou expirées sont exclues
 * avant le groupement afin de ne jamais masquer la baseline de repli.
 */
const buildEffectiveEconomicAccessPipeline = ({
    at,
    commercialInvitationCollectionName,
}) => [
    {
        $match: {
            $or: [
                {
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                    currentPeriodEnd: null,
                    trialEndsAt: null,
                    cancelAtPeriodEnd: false,
                    billingInterval: BILLING_INTERVAL.NONE,
                    priceExclTaxMinor: 0,
                    provider: BILLING_PROVIDER.MANUAL,
                },
                {
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    termType: { $ne: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED },
                    currentPeriodEnd: {
                        $type: 'date',
                        $gt: at,
                    },
                },
                {
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.TRIALING,
                    termType: { $ne: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED },
                    trialEndsAt: {
                        $type: 'date',
                        $gt: at,
                    },
                },
                {
                    kind: SUBSCRIPTION_KIND.BASELINE,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                },
            ],
        },
    },
    {
        $set: {
            entitlementPriority: {
                $switch: {
                    branches: [
                        {
                            case: {
                                $and: [
                                    { $eq: ['$kind', SUBSCRIPTION_KIND.COMMERCIAL] },
                                    { $eq: ['$status', SUBSCRIPTION_STATUS.ACTIVE] },
                                ],
                            },
                            then: 3,
                        },
                        {
                            case: {
                                $and: [
                                    { $eq: ['$kind', SUBSCRIPTION_KIND.COMMERCIAL] },
                                    { $eq: ['$status', SUBSCRIPTION_STATUS.TRIALING] },
                                ],
                            },
                            then: 2,
                        },
                    ],
                    default: 1,
                },
            },
        },
    },
    {
        $sort: {
            workspace: 1,
            entitlementPriority: -1,
            createdAt: -1,
        },
    },
    {
        $group: {
            _id: '$workspace',
            subscription: { $first: '$$ROOT' },
        },
    },
    { $replaceRoot: { newRoot: '$subscription' } },
    {
        $facet: {
            paidActive: [
                {
                    $match: {
                        kind: SUBSCRIPTION_KIND.COMMERCIAL,
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        priceExclTaxMinor: { $gt: 0 },
                    },
                },
                { $count: 'count' },
            ],
            freeActive: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        $or: [
                            { kind: SUBSCRIPTION_KIND.BASELINE },
                            {
                                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                                termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                                priceExclTaxMinor: 0,
                            },
                        ],
                    },
                },
                { $count: 'count' },
            ],
            freeViaCommercialInvitation: [
                {
                    $match: {
                        kind: SUBSCRIPTION_KIND.COMMERCIAL,
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
                        priceExclTaxMinor: 0,
                    },
                },
                {
                    $lookup: {
                        from: commercialInvitationCollectionName,
                        let: { subscriptionId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$subscription', '$$subscriptionId'] },
                                            { $eq: ['$status', COMMERCIAL_INVITATION_STATUS.ACCEPTED] },
                                        ],
                                    },
                                },
                            },
                            { $limit: 1 },
                        ],
                        as: 'commercialInvitation',
                    },
                },
                {
                    $match: {
                        'commercialInvitation.0': { $exists: true },
                    },
                },
                { $count: 'count' },
            ],
            activeTrials: [
                {
                    $match: {
                        kind: SUBSCRIPTION_KIND.COMMERCIAL,
                        status: SUBSCRIPTION_STATUS.TRIALING,
                    },
                },
                { $count: 'count' },
            ],
        },
    },
];

const createPlatformOverviewEconomicKpisService = ({
    SubscriptionModel = Subscription,
    CommercialInvitationModel = CommercialInvitation,
} = {}) => async ({ at = new Date() } = {}) => {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
        throw new TypeError('at must be a valid Date');
    }

    const commercialInvitationCollectionName =
        CommercialInvitationModel.collection?.name ?? 'commercialinvitations';
    const [result = {}] = await SubscriptionModel.aggregate(
        buildEffectiveEconomicAccessPipeline({
            at,
            commercialInvitationCollectionName,
        }),
    );

    return {
        paidActiveSubscriptions: countFacet(result.paidActive),
        freeActiveAccesses: {
            total: countFacet(result.freeActive),
            viaCommercialInvitation:
                countFacet(result.freeViaCommercialInvitation),
        },
        activeTrials: countFacet(result.activeTrials),
    };
};

const getPlatformOverviewEconomicKpis =
    createPlatformOverviewEconomicKpisService();

export {
    buildEffectiveEconomicAccessPipeline,
    createPlatformOverviewEconomicKpisService,
    getPlatformOverviewEconomicKpis,
};
