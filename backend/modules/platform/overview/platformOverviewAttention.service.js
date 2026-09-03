import {
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../../constants/workspace.constants.js';
import { AuditLog } from '../../auditLog/auditLog.model.js';
import {
    EntitlementOverride,
} from '../../entitlementOverride/entitlementOverride.model.js';
import { Subscription } from '../../subscriptions/subscription.model.js';
import { Workspace } from '../../workspace/workspace.model.js';
import {
    ATTENTION_HORIZON_DAYS,
    resolveOverviewPeriod,
} from './platformOverview.service.js';

const ATTENTION_ITEM_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const PLATFORM_ATTENTION_TYPE = Object.freeze({
    SUBSCRIPTION_PAST_DUE: 'subscription_past_due',
    WORKSPACE_SUSPENDED: 'workspace_suspended',
    AUDIT_FAILED: 'audit_failed',
    TRIAL_EXPIRING: 'trial_expiring',
    OVERRIDE_EXPIRING: 'override_expiring',
});

const PLATFORM_ATTENTION_LEVEL = Object.freeze({
    WARNING: 'warning',
});

const PLATFORM_ATTENTION_STATE = Object.freeze({
    CURRENT: 'current',
    UPCOMING: 'upcoming',
});

const toId = (value) => value == null ? null : String(value);

const buildWorkspaceProjectionStages = (workspaceCollectionName) => [
    {
        $lookup: {
            from: workspaceCollectionName,
            localField: 'workspace',
            foreignField: '_id',
            as: 'workspaceDocument',
        },
    },
    {
        $unwind: {
            path: '$workspaceDocument',
            preserveNullAndEmptyArrays: true,
        },
    },
];

/**
 * Récupère les abonnements actuellement en retard et les essais qui arrivent à
 * échéance. Les deux listes restent distinctes afin que leur ordre temporel
 * puisse être interprété correctement lors de la fusion finale.
 */
const buildSubscriptionAttentionPipeline = ({
    at,
    attentionUntil,
    workspaceCollectionName,
}) => [
    {
        $match: {
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
        },
    },
    {
        $facet: {
            pastDue: [
                {
                    $match: {
                        status: SUBSCRIPTION_STATUS.PAST_DUE,
                    },
                },
                { $sort: { updatedAt: -1, _id: -1 } },
                { $limit: ATTENTION_ITEM_LIMIT },
                ...buildWorkspaceProjectionStages(workspaceCollectionName),
                {
                    $project: {
                        _id: 1,
                        workspace: 1,
                        workspaceName: '$workspaceDocument.name',
                        currentPeriodEnd: 1,
                        updatedAt: 1,
                    },
                },
            ],
            trialsExpiring: [
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
                { $sort: { trialEndsAt: 1, _id: 1 } },
                { $limit: ATTENTION_ITEM_LIMIT },
                ...buildWorkspaceProjectionStages(workspaceCollectionName),
                {
                    $project: {
                        _id: 1,
                        workspace: 1,
                        workspaceName: '$workspaceDocument.name',
                        trialEndsAt: 1,
                    },
                },
            ],
        },
    },
];

const buildSuspendedWorkspaceAttentionPipeline = () => [
    {
        $match: {
            status: WORKSPACE_STATUS.SUSPENDED,
        },
    },
    { $sort: { statusChangedAt: -1, _id: -1 } },
    { $limit: ATTENTION_ITEM_LIMIT },
    {
        $project: {
            _id: 1,
            name: 1,
            statusChangedAt: 1,
            statusReason: 1,
        },
    },
];

const buildOverrideAttentionPipeline = ({
    at,
    attentionUntil,
    workspaceCollectionName,
}) => [
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
    { $sort: { endsAt: 1, _id: 1 } },
    { $limit: ATTENTION_ITEM_LIMIT },
    ...buildWorkspaceProjectionStages(workspaceCollectionName),
    {
        $project: {
            _id: 1,
            workspace: 1,
            workspaceName: '$workspaceDocument.name',
            targetType: 1,
            targetKey: {
                $ifNull: ['$featureKey', '$metricKey'],
            },
            endsAt: 1,
        },
    },
];

const buildFailedAuditAttentionPipeline = ({
    from,
    to,
    workspaceCollectionName,
}) => [
    {
        $match: {
            status: AUDIT_STATUS.FAILED,
            createdAt: {
                $gte: from,
                $lt: to,
            },
        },
    },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: ATTENTION_ITEM_LIMIT },
    ...buildWorkspaceProjectionStages(workspaceCollectionName),
    {
        $project: {
            _id: 1,
            workspace: 1,
            workspaceName: '$workspaceDocument.name',
            action: 1,
            entityType: 1,
            entityId: 1,
            createdAt: 1,
        },
    },
];

const serializeWorkspace = ({ id, name }) => ({
    id: toId(id),
    name: name ?? null,
});

const serializeCurrentItems = ({ pastDue = [], suspended = [], audits = [] }) => [
    ...pastDue.map((row) => ({
        id: `${PLATFORM_ATTENTION_TYPE.SUBSCRIPTION_PAST_DUE}:${toId(row._id)}`,
        type: PLATFORM_ATTENTION_TYPE.SUBSCRIPTION_PAST_DUE,
        level: PLATFORM_ATTENTION_LEVEL.WARNING,
        state: PLATFORM_ATTENTION_STATE.CURRENT,
        resourceId: toId(row._id),
        workspace: serializeWorkspace({
            id: row.workspace,
            name: row.workspaceName,
        }),
        referenceAt: row.updatedAt ?? row.currentPeriodEnd ?? null,
        context: {},
    })),
    ...suspended.map((row) => ({
        id: `${PLATFORM_ATTENTION_TYPE.WORKSPACE_SUSPENDED}:${toId(row._id)}`,
        type: PLATFORM_ATTENTION_TYPE.WORKSPACE_SUSPENDED,
        level: PLATFORM_ATTENTION_LEVEL.WARNING,
        state: PLATFORM_ATTENTION_STATE.CURRENT,
        resourceId: toId(row._id),
        workspace: serializeWorkspace({ id: row._id, name: row.name }),
        referenceAt: row.statusChangedAt ?? null,
        context: {
            statusReason: row.statusReason ?? null,
        },
    })),
    ...audits.map((row) => ({
        id: `${PLATFORM_ATTENTION_TYPE.AUDIT_FAILED}:${toId(row._id)}`,
        type: PLATFORM_ATTENTION_TYPE.AUDIT_FAILED,
        level: PLATFORM_ATTENTION_LEVEL.WARNING,
        state: PLATFORM_ATTENTION_STATE.CURRENT,
        resourceId: toId(row._id),
        workspace: serializeWorkspace({
            id: row.workspace,
            name: row.workspaceName,
        }),
        referenceAt: row.createdAt ?? null,
        context: {
            action: row.action,
            entityType: row.entityType ?? null,
            entityId: toId(row.entityId),
        },
    })),
];

const serializeUpcomingItems = ({ trials = [], overrides = [] }) => [
    ...trials.map((row) => ({
        id: `${PLATFORM_ATTENTION_TYPE.TRIAL_EXPIRING}:${toId(row._id)}`,
        type: PLATFORM_ATTENTION_TYPE.TRIAL_EXPIRING,
        level: PLATFORM_ATTENTION_LEVEL.WARNING,
        state: PLATFORM_ATTENTION_STATE.UPCOMING,
        resourceId: toId(row._id),
        workspace: serializeWorkspace({
            id: row.workspace,
            name: row.workspaceName,
        }),
        referenceAt: row.trialEndsAt ?? null,
        context: {},
    })),
    ...overrides.map((row) => ({
        id: `${PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING}:${toId(row._id)}`,
        type: PLATFORM_ATTENTION_TYPE.OVERRIDE_EXPIRING,
        level: PLATFORM_ATTENTION_LEVEL.WARNING,
        state: PLATFORM_ATTENTION_STATE.UPCOMING,
        resourceId: toId(row._id),
        workspace: serializeWorkspace({
            id: row.workspace,
            name: row.workspaceName,
        }),
        referenceAt: row.endsAt ?? null,
        context: {
            targetType: row.targetType,
            targetKey: row.targetKey ?? null,
        },
    })),
];

const toTimestamp = (value, fallback) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.getTime();
};

/**
 * Les problèmes déjà présents sont affichés avant les échéances futures.
 * À l'intérieur d'un groupe, on privilégie le signal actuel le plus récent et
 * l'échéance future la plus proche. Le tri final par id rend les égalités
 * strictement déterministes pour les tests et les rendus React.
 */
const sortAttentionItems = (items) => [...items].sort((left, right) => {
    if (left.state !== right.state) {
        return left.state === PLATFORM_ATTENTION_STATE.CURRENT ? -1 : 1;
    }

    const leftTime = toTimestamp(
        left.referenceAt,
        left.state === PLATFORM_ATTENTION_STATE.CURRENT ? 0 : Number.MAX_SAFE_INTEGER,
    );
    const rightTime = toTimestamp(
        right.referenceAt,
        right.state === PLATFORM_ATTENTION_STATE.CURRENT ? 0 : Number.MAX_SAFE_INTEGER,
    );

    if (leftTime !== rightTime) {
        return left.state === PLATFORM_ATTENTION_STATE.CURRENT
            ? rightTime - leftTime
            : leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
});

/**
 * Produit la projection détaillée du cockpit sans exposer de raison commerciale
 * de dérogation ni de métadonnée technique sensible. Les listes détaillées des
 * domaines restent l'autorité exhaustive ; ce service ne retourne que les
 * points prioritaires utiles à la vue d'ensemble.
 */
const createPlatformOverviewAttentionService = ({
    WorkspaceModel = Workspace,
    SubscriptionModel = Subscription,
    EntitlementOverrideModel = EntitlementOverride,
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
    const workspaceCollectionName =
        WorkspaceModel.collection?.name ?? 'workspaces';

    const [
        subscriptionResult,
        suspendedRows,
        overrideRows,
        auditRows,
    ] = await Promise.all([
        SubscriptionModel.aggregate(
            buildSubscriptionAttentionPipeline({
                at,
                attentionUntil,
                workspaceCollectionName,
            }),
        ),
        WorkspaceModel.aggregate(buildSuspendedWorkspaceAttentionPipeline()),
        EntitlementOverrideModel.aggregate(
            buildOverrideAttentionPipeline({
                at,
                attentionUntil,
                workspaceCollectionName,
            }),
        ),
        AuditLogModel.aggregate(
            buildFailedAuditAttentionPipeline({
                ...period,
                workspaceCollectionName,
            }),
        ),
    ]);

    const subscriptionAttention = subscriptionResult?.[0] ?? {};
    const currentItems = serializeCurrentItems({
        pastDue: subscriptionAttention.pastDue,
        suspended: suspendedRows,
        audits: auditRows,
    });
    const upcomingItems = serializeUpcomingItems({
        trials: subscriptionAttention.trialsExpiring,
        overrides: overrideRows,
    });

    return sortAttentionItems([
        ...currentItems,
        ...upcomingItems,
    ]).slice(0, ATTENTION_ITEM_LIMIT);
};

const getPlatformOverviewAttention = createPlatformOverviewAttentionService();

export {
    ATTENTION_ITEM_LIMIT,
    PLATFORM_ATTENTION_LEVEL,
    PLATFORM_ATTENTION_STATE,
    PLATFORM_ATTENTION_TYPE,
    buildFailedAuditAttentionPipeline,
    buildOverrideAttentionPipeline,
    buildSubscriptionAttentionPipeline,
    buildSuspendedWorkspaceAttentionPipeline,
    createPlatformOverviewAttentionService,
    getPlatformOverviewAttention,
    sortAttentionItems,
};
