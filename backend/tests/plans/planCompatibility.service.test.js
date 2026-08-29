import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PLAN_STATUS } from '../../constants/plan.constants.js';
import {
    USAGE_METRIC_BEHAVIOR,
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';

vi.mock('../../modules/plan/plan.model.js', () => ({
    Plan: {
        findById: vi.fn(),
    },
}));

vi.mock('../../modules/usageMetric/usageMetric.service.js', () => ({
    getUsageMetricValue: vi.fn(),
}));

import { Plan } from '../../modules/plan/plan.model.js';
import {
    assessWorkspacePlanCompatibility,
} from '../../modules/plan/planCompatibility.service.js';
import {
    getUsageMetricValue,
} from '../../modules/usageMetric/usageMetric.service.js';


const buildPlanQuery = (plan) => {
    const query = {
        select: vi.fn(),
        session: vi.fn(),
        lean: vi.fn().mockResolvedValue(plan),
    };

    query.select.mockReturnValue(query);
    query.session.mockReturnValue(query);

    return query;
};

const targetPlanId = new mongoose.Types.ObjectId();
const workspaceId = new mongoose.Types.ObjectId();
const at = new Date('2026-08-29T12:00:00.000Z');


describe('assessWorkspacePlanCompatibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exige le workspace et le plan cible', async () => {
        await expect(
            assessWorkspacePlanCompatibility({
                targetPlanId,
            }),
        ).rejects.toThrow(TypeError);

        await expect(
            assessWorkspacePlanCompatibility({
                workspaceId,
            }),
        ).rejects.toThrow(TypeError);
    });

    it('refuse un plan cible absent ou non actif', async () => {
        Plan.findById.mockReturnValueOnce(
            buildPlanQuery(null),
        );

        await expect(
            assessWorkspacePlanCompatibility({
                workspaceId,
                targetPlanId,
                at,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        Plan.findById.mockReturnValueOnce(
            buildPlanQuery({
                _id: targetPlanId,
                key: 'premium',
                name: 'Premium',
                status: PLAN_STATUS.ARCHIVED,
                limits: {},
            }),
        );

        await expect(
            assessWorkspacePlanCompatibility({
                workspaceId,
                targetPlanId,
                at,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });

    it('sépare les capacités réductibles des consommations déjà réalisées', async () => {
        Plan.findById.mockReturnValue(
            buildPlanQuery({
                _id: targetPlanId,
                key: 'premium',
                name: 'Premium',
                status: PLAN_STATUS.ACTIVE,
                limits: {
                    members: 5,
                    storage_bytes: 20_000,
                    file_uploads_monthly: 10,
                },
            }),
        );

        getUsageMetricValue.mockImplementation(
            async ({ metricKey }) => ({
                members: 8,
                storage_bytes: 25_000,
                file_uploads_monthly: 40,
            })[metricKey],
        );

        const result = await assessWorkspacePlanCompatibility({
            workspaceId,
            targetPlanId,
            at,
        });

        expect(result.compatible).toBe(false);
        expect(result.hasExceededLimits).toBe(true);
        expect(result.targetPlan).toEqual({
            id: targetPlanId.toString(),
            key: 'premium',
            name: 'Premium',
        });

        expect(result.blockingLimits).toEqual([
            expect.objectContaining({
                key: 'members',
                usage: 8,
                limit: 5,
                excess: 3,
                behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
                remediationRequired: true,
            }),
            expect.objectContaining({
                key: 'storage_bytes',
                usage: 25_000,
                limit: 20_000,
                excess: 5_000,
                behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
                remediationRequired: true,
            }),
        ]);

        expect(result.nonBlockingLimits).toEqual([
            expect.objectContaining({
                key: 'file_uploads_monthly',
                usage: 40,
                limit: 10,
                excess: 30,
                periodType:
                    USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
                behavior:
                    USAGE_METRIC_BEHAVIOR.CONSUMPTION,
                remediationRequired: false,
            }),
        ]);
    });

    it('reste compatible si seul un compteur de consommation est dépassé', async () => {
        Plan.findById.mockReturnValue(
            buildPlanQuery({
                _id: targetPlanId,
                key: 'premium',
                name: 'Premium',
                status: PLAN_STATUS.ACTIVE,
                limits: new Map([
                    ['members', 10],
                    ['file_uploads_monthly', 5],
                    ['storage_bytes', null],
                ]),
            }),
        );

        getUsageMetricValue.mockImplementation(
            async ({ metricKey }) => ({
                members: 4,
                file_uploads_monthly: 12,
            })[metricKey],
        );

        const result = await assessWorkspacePlanCompatibility({
            workspaceId,
            targetPlanId,
            at,
        });

        expect(result.compatible).toBe(true);
        expect(result.hasExceededLimits).toBe(true);
        expect(result.blockingLimits).toEqual([]);
        expect(result.nonBlockingLimits).toHaveLength(1);

        /*
         * Une limite null est explicitement illimitée : aucune lecture d'usage
         * n'est nécessaire pour décider de la compatibilité.
         */
        expect(getUsageMetricValue).toHaveBeenCalledTimes(2);
    });

    it('retourne un état pleinement compatible lorsque toutes les limites sont respectées', async () => {
        Plan.findById.mockReturnValue(
            buildPlanQuery({
                _id: targetPlanId,
                key: 'premium',
                name: 'Premium',
                status: PLAN_STATUS.ACTIVE,
                limits: {
                    members: 5,
                    storage_bytes: 20_000,
                },
            }),
        );

        getUsageMetricValue.mockResolvedValue(5);

        const result = await assessWorkspacePlanCompatibility({
            workspaceId,
            targetPlanId,
            at,
        });

        expect(result).toMatchObject({
            compatible: true,
            hasExceededLimits: false,
            blockingLimits: [],
            nonBlockingLimits: [],
        });
    });

    it('refuse d’inventer la stratégie d’une métrique métier incomplètement définie', async () => {
        const registry = {
            getMetricDefinition: vi.fn().mockReturnValue({
                periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            }),
        };

        Plan.findById.mockReturnValue(
            buildPlanQuery({
                _id: targetPlanId,
                key: 'custom',
                name: 'Custom',
                status: PLAN_STATUS.ACTIVE,
                limits: {
                    properties: 3,
                },
            }),
        );

        await expect(
            assessWorkspacePlanCompatibility({
                workspaceId,
                targetPlanId,
                at,
                registry,
            }),
        ).rejects.toThrow(
            'Metric "properties" is missing plan compatibility semantics',
        );

        expect(getUsageMetricValue).not.toHaveBeenCalled();
    });
});