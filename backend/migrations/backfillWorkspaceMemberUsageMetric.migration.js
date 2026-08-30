import {
    CORE_PLAN_METRIC,
} from '../modules/plan/planCapability.registry.js';
import {
    UsageMetric,
} from '../modules/usageMetric/usageMetric.model.js';
import {
    WorkspaceMember,
} from '../modules/workspaceMember/workspaceMember.model.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../constants/workspaceMember.constants.js';
import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../constants/usageMetric.constants.js';

/**
 * Recalcule la capacité `members` depuis les memberships réellement occupés.
 *
 * La migration est idempotente : elle remplace la valeur courante par le
 * nombre de memberships active + suspended au lieu d'ajouter un delta.
 * Les memberships removed et les invitations ne consomment aucune place.
 */
const backfillWorkspaceMemberUsageMetric = async () => {
    const occupiedByWorkspace = await WorkspaceMember.aggregate([
        {
            $match: {
                status: {
                    $in: [
                        WORKSPACE_MEMBER_STATUS.ACTIVE,
                        WORKSPACE_MEMBER_STATUS.SUSPENDED,
                    ],
                },
            },
        },
        {
            $group: {
                _id: '$workspace',
                value: { $sum: 1 },
            },
        },
    ]).exec();

    let updated = 0;

    for (const entry of occupiedByWorkspace) {
        await UsageMetric.findOneAndUpdate(
            {
                workspace: entry._id,
                metricKey: CORE_PLAN_METRIC.MEMBERS,
                periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
                periodStart: null,
            },
            {
                $set: {
                    value: entry.value,
                    updatedBy: null,
                },
                $setOnInsert: {
                    workspace: entry._id,
                    metricKey: CORE_PLAN_METRIC.MEMBERS,
                    periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
                    periodStart: null,
                    periodEnd: null,
                    createdBy: null,
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
                setDefaultsOnInsert: true,
            },
        );

        updated += 1;
    }

    return {
        workspacesUpdated: updated,
    };
};

export { backfillWorkspaceMemberUsageMetric };
