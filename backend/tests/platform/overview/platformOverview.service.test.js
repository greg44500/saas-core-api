import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    calculateGrowthPercent,
    createPlatformOverviewService,
    resolveOverviewPeriod,
} from '../../../modules/platform/overview/platformOverview.service.js';

const AT = new Date('2026-09-03T12:00:00.000Z');
const FROM = new Date('2026-08-03T12:00:00.000Z');
const TO = new Date('2026-09-03T12:00:00.000Z');

const createAggregateModel = (...results) => ({
    aggregate: vi.fn()
        .mockImplementationOnce(async () => results[0])
        .mockImplementationOnce(async () => results[1])
        .mockImplementationOnce(async () => results[2]),
});

describe('platformOverview.service', () => {
    it('résout une période par défaut de 30 jours et une comparaison de même durée', () => {
        const period = resolveOverviewPeriod({ at: AT });

        expect(period.to).toEqual(AT);
        expect(period.from).toEqual(
            new Date('2026-08-04T12:00:00.000Z'),
        );
        expect(period.previousTo).toEqual(period.from);
        expect(period.previousFrom).toEqual(
            new Date('2026-07-05T12:00:00.000Z'),
        );
    });

    it('ne fabrique pas de pourcentage de croissance quand la base vaut zéro', () => {
        expect(calculateGrowthPercent(5, 0)).toBeNull();
        expect(calculateGrowthPercent(15, 10)).toBe(50);
        expect(calculateGrowthPercent(5, 10)).toBe(-50);
    });

    it('compose une vue analytique générique sans mélanger les devises ni les plans historiques', async () => {
        const UserModel = createAggregateModel([
            {
                total: [{ count: 100 }],
                byStatus: [
                    { _id: 'active', count: 94 },
                    { _id: 'disabled', count: 6 },
                ],
                createdInPeriod: [{ count: 10 }],
                createdInPreviousPeriod: [{ count: 5 }],
            },
        ]);
        const WorkspaceModel = createAggregateModel([
            {
                total: [{ count: 50 }],
                byStatus: [
                    { _id: 'active', count: 48 },
                    { _id: 'suspended', count: 2 },
                ],
                createdInPeriod: [{ count: 4 }],
                createdInPreviousPeriod: [{ count: 2 }],
            },
        ]);
        const SubscriptionModel = createAggregateModel(
            [
                {
                    byStatus: [
                        { _id: 'active', count: 20 },
                        { _id: 'trialing', count: 4 },
                        { _id: 'past_due', count: 3 },
                    ],
                    activeCommercial: [{ count: 20 }],
                    activeTrials: [{ count: 4 }],
                    trialsExpiringSoon: [{ count: 2 }],
                    cancellationScheduled: [{ count: 1 }],
                    downgradeScheduled: [{ count: 1 }],
                },
            ],
            [
                {
                    planId: 'premium-plan',
                    key: 'premium',
                    name: 'Premium',
                    workspaceCount: 30,
                },
                {
                    planId: 'free-plan',
                    key: 'free',
                    name: 'Free',
                    workspaceCount: 20,
                },
            ],
            [
                { _id: 'EUR', amountMinor: 23700.4 },
                { _id: 'USD', amountMinor: 4900 },
            ],
        );
        const EntitlementOverrideModel = createAggregateModel([
            {
                active: [{ count: 5 }],
                scheduled: [{ count: 2 }],
                expiringSoon: [{ count: 1 }],
            },
        ]);
        const UsageMetricModel = createAggregateModel([
            { _id: 'members', value: 120 },
            { _id: 'storage_bytes', value: 2048 },
        ]);
        const FileModel = createAggregateModel([
            {
                totals: [{ totalCount: 10, totalSizeBytes: 1000 }],
                byType: [
                    {
                        _id: 'application/pdf',
                        extensions: ['pdf'],
                        count: 6,
                        sizeBytes: 700,
                    },
                    {
                        _id: 'image/jpeg',
                        extensions: ['jpg', 'jpeg'],
                        count: 3,
                        sizeBytes: 250,
                    },
                    {
                        _id: 'image/png',
                        extensions: ['png'],
                        count: 1,
                        sizeBytes: 50,
                    },
                ],
            },
        ]);
        const AuditLogModel = createAggregateModel([
            {
                total: [{ count: 2 }],
                recent: [
                    {
                        _id: 'audit-1',
                        action: 'LOGIN_FAILED',
                        entityType: null,
                        entityId: null,
                        workspace: null,
                        createdAt: new Date('2026-09-03T10:00:00.000Z'),
                    },
                ],
            },
        ]);
        const PlanModel = {
            collection: { name: 'plans' },
        };

        const service = createPlatformOverviewService({
            UserModel,
            WorkspaceModel,
            SubscriptionModel,
            PlanModel,
            EntitlementOverrideModel,
            UsageMetricModel,
            FileModel,
            AuditLogModel,
        });

        const overview = await service({
            from: FROM,
            to: TO,
            at: AT,
        });

        expect(overview.kpis.users).toEqual({
            total: 100,
            createdInPeriod: 10,
            createdInPreviousPeriod: 5,
            changePercent: 100,
        });
        expect(overview.kpis.workspaces.changePercent).toBe(100);
        expect(overview.kpis.activeCommercialSubscriptions).toBe(20);
        expect(overview.kpis.contractedMrrEstimate).toEqual({
            basis: 'gross_before_discounts',
            isRevenue: false,
            byCurrency: [
                { currency: 'EUR', amountMinor: 23700 },
                { currency: 'USD', amountMinor: 4900 },
            ],
        });
        expect(overview.planDistribution).toEqual([
            {
                plan: {
                    id: 'premium-plan',
                    key: 'premium',
                    name: 'Premium',
                },
                workspaceCount: 30,
                percentage: 60,
            },
            {
                plan: {
                    id: 'free-plan',
                    key: 'free',
                    name: 'Free',
                },
                workspaceCount: 20,
                percentage: 40,
            },
        ]);
        expect(overview.subscriptionHealth).toMatchObject({
            activeCommercial: 20,
            activeTrials: 4,
            trialsExpiringNext7Days: 2,
            cancellationScheduled: 1,
            downgradeScheduled: 1,
        });
        expect(overview.overrides).toEqual({
            active: 5,
            scheduled: 2,
            expiringNext7Days: 1,
        });
        expect(overview.usage).toEqual([
            { key: 'members', value: 120 },
            { key: 'storage_bytes', value: 2048 },
        ]);
        expect(overview.files).toEqual({
            totalCount: 10,
            totalSizeBytes: 1000,
            byType: [
                {
                    mimeType: 'application/pdf',
                    extensions: ['pdf'],
                    count: 6,
                    sizeBytes: 700,
                    percentageOfCount: 60,
                    percentageOfStorage: 70,
                },
                {
                    mimeType: 'image/jpeg',
                    extensions: ['jpg', 'jpeg'],
                    count: 3,
                    sizeBytes: 250,
                    percentageOfCount: 30,
                    percentageOfStorage: 25,
                },
                {
                    mimeType: 'image/png',
                    extensions: ['png'],
                    count: 1,
                    sizeBytes: 50,
                    percentageOfCount: 10,
                    percentageOfStorage: 5,
                },
            ],
        });
        expect(overview.attention.counts).toEqual({
            pastDueSubscriptions: 3,
            suspendedWorkspaces: 2,
            failedAuditEvents: 2,
            trialsExpiringNext7Days: 2,
            overridesExpiringNext7Days: 1,
        });
        expect(overview.attention.totalSignals).toBe(10);
        expect(overview.attention.recentFailedAuditEvents[0]).toMatchObject({
            id: 'audit-1',
            action: 'LOGIN_FAILED',
            entityType: null,
            entityId: null,
            workspaceId: null,
        });

        expect(UserModel.aggregate).toHaveBeenCalledOnce();
        expect(WorkspaceModel.aggregate).toHaveBeenCalledOnce();
        expect(SubscriptionModel.aggregate).toHaveBeenCalledTimes(3);
        expect(EntitlementOverrideModel.aggregate).toHaveBeenCalledOnce();
        expect(UsageMetricModel.aggregate).toHaveBeenCalledOnce();
        expect(FileModel.aggregate).toHaveBeenCalledOnce();
        expect(AuditLogModel.aggregate).toHaveBeenCalledOnce();
    });
});
