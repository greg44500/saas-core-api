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
    assessWorkspaceLimitsCompatibility,
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


describe('assessWorkspaceLimitsCompatibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('applique directement des limites déjà composées par l’entitlement', async () => {
        getUsageMetricValue.mockImplementation(
            async ({ metricKey }) => ({
                members: 4,
                storage_bytes: 25_000,
            })[metricKey],
        );

        const result = await assessWorkspaceLimitsCompatibility({
            workspaceId,
            limits: {
                members: 3,
                storage_bytes: null,
            },
            at,
        });

        expect(result.compatible).toBe(false);
        expect(result.blockingLimits).toEqual([
            expect.objectContaining({
                key: 'members',
                usage: 4,
                limit: 3,
                excess: 1,
            }),
        ]);

        /*
         * Une augmentation vers `null` par override rend la métrique illimitée
         * et ne doit provoquer aucune lecture UsageMetric inutile.
         */
        expect(getUsageMetricValue).toHaveBeenCalledTimes(1);
    });

    it('conserve la distinction capacity / consumption sur les limites effectives', async () => {
        getUsageMetricValue.mockImplementation(
            async ({ metricKey }) => ({
                members: 8,
                file_uploads_monthly: 40,
            })[metricKey],
        );

        const result = await assessWorkspaceLimitsCompatibility({
            workspaceId,
            limits: {
                members: 5,
                file_uploads_monthly: 10,
            },
            at,
        });

        expect(result.compatible).toBe(false);
        expect(result.blockingLimits).toHaveLength(1);
        expect(result.nonBlockingLimits).toHaveLength(1);
        expect(result.nonBlockingLimits[0]).toMatchObject({
            key: 'file_uploads_monthly',
            behavior: USAGE_METRIC_BEHAVIOR.CONSUMPTION,
            remediationRequired: false,
        });
    });
});


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