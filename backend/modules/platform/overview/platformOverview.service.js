import {
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    BILLING_INTERVAL,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../../../constants/usageMetric.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../../constants/workspace.constants.js';
import { AuditLog } from '../../auditLog/auditLog.model.js';
import {
    EntitlementOverride,
} from '../../entitlementOverride/entitlementOverride.model.js';
import { Plan } from '../../plan/plan.model.js';
import { Subscription } from '../../subscriptions/subscription.model.js';
import { UsageMetric } from '../../usageMetric/usageMetric.model.js';
import { User } from '../../users/user.model.js';
import { Workspace } from '../../workspace/workspace.model.js';

const DEFAULT_OVERVIEW_PERIOD_DAYS = 30;
const ATTENTION_HORIZON_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

const countFacet = (facet) => facet?.[0]?.count ?? 0;

const toStatusCounts = (rows = []) => Object.fromEntries(
    rows.map((row) => [row._id, row.count]),
);

const toId = (value) => value == null ? null : String(value);

/**
 * Compare deux périodes de même durée sans inventer un pourcentage lorsque la
 * période précédente vaut zéro. `null` signale au frontend que la comparaison
 * n'est pas mathématiquement pertinente et doit être présentée comme telle.
 */
const calculateGrowthPercent = (current, previous) => {
    if (previous === 0) {
        return null;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
};

const calculateSharePercent = (count, total) => {
    if (total === 0) {
        return 0;
    }

    return Number(((count / total) * 100).toFixed(1));
};

/**
 * Résout une fenêtre courante et la fenêtre précédente de même durée.
 *
 * Les comparaisons utilisent des intervalles demi-ouverts `[from, to)` afin
 * qu'un instant frontière ne puisse jamais appartenir aux deux périodes.
 */
const resolveOverviewPeriod = ({
    from,
    to,
    at = new Date(),
} = {}) => {
    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    const resolvedTo = to ?? at;
    const resolvedFrom = from
        ?? new Date(resolvedTo.getTime() - DEFAULT_OVERVIEW_PERIOD_DAYS * DAY_MS);

    if (!isValidDate(resolvedFrom) || !isValidDate(resolvedTo)) {
        throw new TypeError('from and to must be valid Dates');
    }

    if (resolvedTo <= resolvedFrom) {
        throw new TypeError('to must be after from');
    }

    const durationMs = resolvedTo.getTime() - resolvedFrom.getTime();
    const previousTo = new Date(resolvedFrom);
    const previousFrom = new Date(resolvedFrom.getTime() - durationMs);

    return {
        from: resolvedFrom,
        to: resolvedTo,
        previousFrom,
        previousTo,
    };
};

const buildEntityOverviewPipeline = ({
    from,
    to,
    previousFrom,
    previousTo,
}) => [
    {
        $facet: {
            total: [
                { $count: 'count' },
            ],
            byStatus: [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ],
            createdInPeriod: [
                {
                    $match: {
                        createdAt: {
                            $gte: from,
                            $lt: to,
                        },
                    },
                },
                { $count: 'count' },
            ],
            createdInPreviousPeriod: [
                {
                    $match: {
                        createdAt: {
                            $gte: previousFrom,
                            $lt: previousTo,
                        },
                    },
                },
                { $count: 'count' },
            ],
        },
    },
];

const buildSubscriptionHealthPipeline = ({ at, attentionUntil }) => [
    {
        $match: {
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
        },
    },
    {
        $facet: {
            byStatus: [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ],
            activeCommercial: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        currentPeriodEnd: {
                            $type: 'date',
                            $gt: at,
                        },
                    },
                },
                { $count: 'count' },
            ],
            activeTrials: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.TRIALING,
                        trialEndsAt: {
                            $type: 'date',
                            $gt: at,
                        },
                    },
                },
                { $count: 'count' },
            ],
            trialsExpiringSoon: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.TRIALING,
                        trialEndsAt: {
                            $type: 'date',
                            $gt: at,
                            $lte: attentionUntil,
                        },
                    },
                },
                { $count: 'count' },
            ],
            cancellationScheduled: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        cancelAtPeriodEnd: true,
                        currentPeriodEnd: {
                            $type: 'date',
                            $gt: at,
                        },
                    },
                },
                { $count: 'count' },
            ],
            downgradeScheduled: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        'scheduledChange.type':
                            SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                        'scheduledChange.effectiveAt': {
                            $type: 'date',
                            $gt: at,
                        },
                    },
                },
                { $count: 'count' },
            ],
        },
    },
];

/**
 * Reproduit la priorité commerciale du resolver Workspace sans exécuter une
 * lecture par tenant : commercial active > trialing valide > baseline active.
 * Cette agrégation permet d'afficher la répartition des workspaces par Plan
 * réellement effectif, et non par simple présence historique de Subscription.
 */
const buildEffectivePlanDistributionPipeline = ({
    at,
    planCollectionName,
}) => [
    {
        $match: {
            $or: [
                {
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    currentPeriodEnd: {
                        $type: 'date',
                        $gt: at,
                    },
                },
                {
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.TRIALING,
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
            plan: { $first: '$plan' },
        },
    },
    {
        $group: {
            _id: '$plan',
            workspaceCount: { $sum: 1 },
        },
    },
    {
        $lookup: {
            from: planCollectionName,
            localField: '_id',
            foreignField: '_id',
            as: 'plan',
        },
    },
    { $unwind: '$plan' },
    {
        $project: {
            _id: 0,
            planId: '$plan._id',
            key: '$plan.key',
            name: '$plan.name',
            workspaceCount: 1,
        },
    },
    {
        $sort: {
            workspaceCount: -1,
            name: 1,
        },
    },
];

/**
 * Le MRR exposé ici reste un indicateur contractuel brut, pas un revenu.
 *
 * - seules les subscriptions commerciales actives et temporellement valides
 *   sont prises en compte ;
 * - le snapshot `priceExclTaxMinor` est l'autorité tarifaire ;
 * - les remises et les encaissements ne sont pas appliqués dans ce premier
 *   indicateur ;
 * - chaque devise est agrégée séparément ;
 * - une périodicité annuelle est ramenée à 1/12 puis arrondie à l'unité mineure
 *   lors de la sérialisation.
 */
const buildContractedMrrPipeline = ({ at }) => [
    {
        $match: {
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: {
                $type: 'date',
                $gt: at,
            },
            billingInterval: {
                $in: [
                    BILLING_INTERVAL.MONTHLY,
                    BILLING_INTERVAL.YEARLY,
                ],
            },
        },
    },
    {
        $project: {
            currency: 1,
            monthlyEquivalentMinor: {
                $cond: [
                    { $eq: ['$billingInterval', BILLING_INTERVAL.YEARLY] },
                    { $divide: ['$priceExclTaxMinor', 12] },
                    '$priceExclTaxMinor',
                ],
            },
        },
    },
    {
        $group: {
            _id: '$currency',
            amountMinor: { $sum: '$monthlyEquivalentMinor' },
        },
    },
    { $sort: { _id: 1 } },
];

const buildOverrideHealthPipeline = ({ at, attentionUntil }) => [
    {
        $facet: {
            active: [
                {
                    $match: {
                        revokedAt: null,
                        startsAt: { $lte: at },
                        $or: [
                            { endsAt: null },
                            { endsAt: { $gt: at } },
                        ],
                    },
                },
                { $count: 'count' },
            ],
            scheduled: [
                {
                    $match: {
                        revokedAt: null,
                        startsAt: { $gt: at },
                    },
                },
                { $count: 'count' },
            ],
            expiringSoon: [
                {
                    $match: {
                        revokedAt: null,
                        startsAt: { $lte: at },
                        endsAt: {
                            $type: 'date',
                            $gt: at,
                            $lte: attentionUntil,
                        },
                    },
                },
                { $count: 'count' },
            ],
        },
    },
];

/**
 * Les métriques CURRENT sont des jauges actuelles. Les métriques mensuelles ne
 * retiennent que la fenêtre contenant `at`, afin de ne jamais sommer plusieurs
 * mois historiques dans un même indicateur de dashboard.
 */
const buildUsagePipeline = ({ at }) => [
    {
        $match: {
            $or: [
                {
                    periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
                },
                {
                    periodType:
                        USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
                    periodStart: { $lte: at },
                    periodEnd: { $gt: at },
                },
            ],
        },
    },
    {
        $group: {
            _id: '$metricKey',
            value: { $sum: '$value' },
        },
    },
    { $sort: { _id: 1 } },
];

const buildAuditAttentionPipeline = ({ from, to }) => [
    {
        $match: {
            status: AUDIT_STATUS.FAILED,
            createdAt: {
                $gte: from,
                $lt: to,
            },
        },
    },
    {
        $facet: {
            total: [
                { $count: 'count' },
            ],
            recent: [
                { $sort: { createdAt: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 1,
                        action: 1,
                        entityType: 1,
                        entityId: 1,
                        workspace: 1,
                        createdAt: 1,
                    },
                },
            ],
        },
    },
];

/**
 * Crée le service de synthèse Platform.
 *
 * Les agrégations sont indépendantes et peuvent donc être exécutées en
 * parallèle. Le dashboard accepte un léger décalage entre collections : il
 * s'agit d'une vue analytique, pas d'une décision transactionnelle. Toutes les
 * règles temporelles partagent néanmoins le même instant `at` pour éviter des
 * incohérences autour d'une échéance de trial ou d'abonnement.
 */
const createPlatformOverviewService = ({
    UserModel = User,
    WorkspaceModel = Workspace,
    SubscriptionModel = Subscription,
    PlanModel = Plan,
    EntitlementOverrideModel = EntitlementOverride,
    UsageMetricModel = UsageMetric,
    AuditLogModel = AuditLog,
} = {}) => async ({
    from,
    to,
    at = new Date(),
} = {}) => {
    const period = resolveOverviewPeriod({ from, to, at });
    const attentionUntil = new Date(
        at.getTime() + ATTENTION_HORIZON_DAYS * DAY_MS,
    );

    const entityPeriodPipeline = buildEntityOverviewPipeline(period);
    const planCollectionName = PlanModel.collection?.name ?? 'plans';

    const [
        userResult,
        workspaceResult,
        subscriptionResult,
        planDistributionRows,
        contractedMrrRows,
        overrideResult,
        usageRows,
        auditResult,
    ] = await Promise.all([
        UserModel.aggregate(entityPeriodPipeline),
        WorkspaceModel.aggregate(entityPeriodPipeline),
        SubscriptionModel.aggregate(
            buildSubscriptionHealthPipeline({ at, attentionUntil }),
        ),
        SubscriptionModel.aggregate(
            buildEffectivePlanDistributionPipeline({
                at,
                planCollectionName,
            }),
        ),
        SubscriptionModel.aggregate(buildContractedMrrPipeline({ at })),
        EntitlementOverrideModel.aggregate(
            buildOverrideHealthPipeline({ at, attentionUntil }),
        ),
        UsageMetricModel.aggregate(buildUsagePipeline({ at })),
        AuditLogModel.aggregate(
            buildAuditAttentionPipeline(period),
        ),
    ]);

    const users = userResult?.[0] ?? {};
    const workspaces = workspaceResult?.[0] ?? {};
    const subscriptions = subscriptionResult?.[0] ?? {};
    const overrides = overrideResult?.[0] ?? {};
    const audit = auditResult?.[0] ?? {};

    const userCreatedCurrent = countFacet(users.createdInPeriod);
    const userCreatedPrevious = countFacet(users.createdInPreviousPeriod);
    const workspaceCreatedCurrent = countFacet(workspaces.createdInPeriod);
    const workspaceCreatedPrevious =
        countFacet(workspaces.createdInPreviousPeriod);

    const planDistributionTotal = planDistributionRows.reduce(
        (sum, row) => sum + row.workspaceCount,
        0,
    );

    const subscriptionStatusCounts = toStatusCounts(subscriptions.byStatus);
    const workspaceStatusCounts = toStatusCounts(workspaces.byStatus);
    const failedAuditEvents = countFacet(audit.total);
    const pastDueSubscriptions =
        subscriptionStatusCounts[SUBSCRIPTION_STATUS.PAST_DUE] ?? 0;
    const suspendedWorkspaces =
        workspaceStatusCounts[WORKSPACE_STATUS.SUSPENDED] ?? 0;
    const trialsExpiringSoon = countFacet(subscriptions.trialsExpiringSoon);
    const overridesExpiringSoon = countFacet(overrides.expiringSoon);

    return {
        generatedAt: new Date(at),
        period: {
            from: period.from,
            to: period.to,
            previousFrom: period.previousFrom,
            previousTo: period.previousTo,
        },
        kpis: {
            users: {
                total: countFacet(users.total),
                createdInPeriod: userCreatedCurrent,
                createdInPreviousPeriod: userCreatedPrevious,
                changePercent: calculateGrowthPercent(
                    userCreatedCurrent,
                    userCreatedPrevious,
                ),
            },
            workspaces: {
                total: countFacet(workspaces.total),
                createdInPeriod: workspaceCreatedCurrent,
                createdInPreviousPeriod: workspaceCreatedPrevious,
                changePercent: calculateGrowthPercent(
                    workspaceCreatedCurrent,
                    workspaceCreatedPrevious,
                ),
            },
            activeCommercialSubscriptions:
                countFacet(subscriptions.activeCommercial),
            contractedMrrEstimate: {
                basis: 'gross_before_discounts',
                isRevenue: false,
                byCurrency: contractedMrrRows.map((row) => ({
                    currency: row._id,
                    amountMinor: Math.round(row.amountMinor ?? 0),
                })),
            },
        },
        users: {
            byStatus: toStatusCounts(users.byStatus),
        },
        workspaces: {
            byStatus: workspaceStatusCounts,
        },
        planDistribution: planDistributionRows.map((row) => ({
            plan: {
                id: toId(row.planId),
                key: row.key,
                name: row.name,
            },
            workspaceCount: row.workspaceCount,
            percentage: calculateSharePercent(
                row.workspaceCount,
                planDistributionTotal,
            ),
        })),
        subscriptionHealth: {
            byStatus: subscriptionStatusCounts,
            activeCommercial:
                countFacet(subscriptions.activeCommercial),
            activeTrials: countFacet(subscriptions.activeTrials),
            trialsExpiringNext7Days: trialsExpiringSoon,
            cancellationScheduled:
                countFacet(subscriptions.cancellationScheduled),
            downgradeScheduled:
                countFacet(subscriptions.downgradeScheduled),
        },
        overrides: {
            active: countFacet(overrides.active),
            scheduled: countFacet(overrides.scheduled),
            expiringNext7Days: overridesExpiringSoon,
        },
        usage: usageRows.map((row) => ({
            key: row._id,
            value: row.value,
        })),
        attention: {
            totalSignals:
                pastDueSubscriptions
                + suspendedWorkspaces
                + failedAuditEvents
                + trialsExpiringSoon
                + overridesExpiringSoon,
            counts: {
                pastDueSubscriptions,
                suspendedWorkspaces,
                failedAuditEvents,
                trialsExpiringNext7Days: trialsExpiringSoon,
                overridesExpiringNext7Days: overridesExpiringSoon,
            },
            recentFailedAuditEvents: (audit.recent ?? []).map((row) => ({
                id: toId(row._id),
                action: row.action,
                entityType: row.entityType ?? null,
                entityId: toId(row.entityId),
                workspaceId: toId(row.workspace),
                createdAt: row.createdAt,
            })),
        },
    };
};

const getPlatformOverview = createPlatformOverviewService();

export {
    ATTENTION_HORIZON_DAYS,
    DEFAULT_OVERVIEW_PERIOD_DAYS,
    buildContractedMrrPipeline,
    buildEffectivePlanDistributionPipeline,
    calculateGrowthPercent,
    calculateSharePercent,
    createPlatformOverviewService,
    getPlatformOverview,
    resolveOverviewPeriod,
};
