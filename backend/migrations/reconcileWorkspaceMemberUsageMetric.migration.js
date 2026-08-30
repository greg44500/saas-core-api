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
 * Réconcilie les métriques `members` déjà persistées avec les memberships
 * réellement occupants.
 *
 * Le backfill historique ne voyait que les workspaces possédant au moins un
 * membre active/suspended. Une métrique existante pouvait donc rester > 0
 * lorsqu'un workspace n'avait plus aucun membership occupant. Cette migration
 * forward-only corrige ce cas sans réécrire la migration historique.
 *
 * La valeur est recalculée, jamais incrémentée : le traitement est idempotent
 * et peut être rejoué après un échec partiel.
 */
const reconcileWorkspaceMemberUsageMetric = async () => {
    const metrics = await UsageMetric.find({
        metricKey: CORE_PLAN_METRIC.MEMBERS,
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        periodStart: null,
    })
        .select('_id workspace value')
        .lean();

    let updated = 0;
    let unchanged = 0;

    for (const metric of metrics) {
        const occupiedMembers = await WorkspaceMember.countDocuments({
            workspace: metric.workspace,
            status: {
                $in: [
                    WORKSPACE_MEMBER_STATUS.ACTIVE,
                    WORKSPACE_MEMBER_STATUS.SUSPENDED,
                ],
            },
        });

        if (metric.value === occupiedMembers) {
            unchanged += 1;
            continue;
        }

        await UsageMetric.updateOne(
            { _id: metric._id },
            {
                $set: {
                    value: occupiedMembers,
                    updatedBy: null,
                },
            },
            { runValidators: true },
        );

        updated += 1;
    }

    return {
        metricsScanned: metrics.length,
        updated,
        unchanged,
    };
};

export { reconcileWorkspaceMemberUsageMetric };
