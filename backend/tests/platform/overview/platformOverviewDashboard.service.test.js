import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    createPlatformOverviewDashboardService,
} from '../../../modules/platform/overview/platformOverviewDashboard.service.js';

const AT = new Date('2026-09-03T12:00:00.000Z');
const FROM = new Date('2026-08-03T12:00:00.000Z');
const TO = new Date('2026-09-03T12:00:00.000Z');

const CLIENT_USER_POPULATION = {
    total: 8,
    createdInPeriod: 4,
    createdInPreviousPeriod: 2,
    changePercent: 100,
    byStatus: {
        active: { count: 6, percentage: 75 },
        disabled: { count: 1, percentage: 12.5 },
        deletionRequested: { count: 1, percentage: 12.5 },
    },
    byAccess: {
        active: { count: 7, percentage: 87.5 },
        suspendedOnly: { count: 1, percentage: 12.5 },
    },
    byRelationship: {
        owner: { count: 3, percentage: 37.5 },
        withoutOwnership: { count: 5, percentage: 62.5 },
    },
};

describe('platformOverviewDashboard.service', () => {
    it('remplace les métriques User globales par la population cliente avant projection', async () => {
        const getOverview = vi.fn(async () => ({
            generatedAt: AT,
            kpis: {
                users: { total: 12 },
                workspaces: { total: 6 },
            },
            users: {
                byStatus: { active: 12 },
            },
            attention: {
                totalSignals: 3,
                counts: { failedAuditEvents: 3 },
            },
        }));
        const getAttention = vi.fn(async () => [
            {
                id: 'audit_failed:audit-1',
                type: 'audit_failed',
                level: 'warning',
            },
        ]);
        const getEconomicKpis = vi.fn(async () => ({
            paidActiveSubscriptions: 2,
            freeActiveAccesses: {
                total: 4,
                viaCommercialInvitation: 1,
            },
            activeTrials: 0,
        }));
        const getUserPopulation = vi.fn(async () => CLIENT_USER_POPULATION);
        const projectOverview = vi.fn(({ overview }) => overview);
        const service = createPlatformOverviewDashboardService({
            getOverview,
            getAttention,
            getEconomicKpis,
            getUserPopulation,
            projectOverview,
        });
        const permissions = [
            PLATFORM_PERMISSION.OVERVIEW_READ,
            PLATFORM_PERMISSION.AUDIT_LOGS_READ,
        ];

        const overview = await service({
            from: FROM,
            to: TO,
            at: AT,
            permissions,
        });

        expect(getOverview).toHaveBeenCalledWith({
            from: FROM,
            to: TO,
            at: AT,
        });
        expect(getAttention).toHaveBeenCalledWith({
            from: FROM,
            to: TO,
            at: AT,
        });
        expect(getEconomicKpis).toHaveBeenCalledWith({ at: AT });
        expect(getUserPopulation).toHaveBeenCalledWith({
            from: FROM,
            to: TO,
            at: AT,
        });
        expect(projectOverview).toHaveBeenCalledWith({
            overview: {
                generatedAt: AT,
                kpis: {
                    users: {
                        total: 8,
                        createdInPeriod: 4,
                        createdInPreviousPeriod: 2,
                        changePercent: 100,
                    },
                    workspaces: { total: 6 },
                    paidActiveSubscriptions: 2,
                    freeActiveAccesses: {
                        total: 4,
                        viaCommercialInvitation: 1,
                    },
                    activeTrials: 0,
                },
                users: {
                    byStatus: {
                        active: 6,
                        disabled: 1,
                        deletion_requested: 1,
                    },
                    distributions: {
                        accountStatus: CLIENT_USER_POPULATION.byStatus,
                        access: CLIENT_USER_POPULATION.byAccess,
                        relationship: CLIENT_USER_POPULATION.byRelationship,
                    },
                },
                attention: {
                    totalSignals: 3,
                    counts: { failedAuditEvents: 3 },
                    items: [
                        {
                            id: 'audit_failed:audit-1',
                            type: 'audit_failed',
                            level: 'warning',
                        },
                    ],
                },
            },
            permissions,
        });
        expect(overview.kpis.users.total).toBe(8);
        expect(overview.attention.items).toHaveLength(1);
    });

    it('est fail-closed si aucune permission runtime n’est transmise', async () => {
        const getOverview = vi.fn(async () => ({
            generatedAt: AT,
            period: {},
            kpis: { users: { total: 12 } },
            users: { byStatus: { active: 12 } },
            attention: { counts: {} },
        }));
        const getAttention = vi.fn(async () => []);
        const getEconomicKpis = vi.fn(async () => ({
            paidActiveSubscriptions: 1,
            freeActiveAccesses: { total: 2, viaCommercialInvitation: 1 },
            activeTrials: 0,
        }));
        const getUserPopulation = vi.fn(async () => CLIENT_USER_POPULATION);
        const service = createPlatformOverviewDashboardService({
            getOverview,
            getAttention,
            getEconomicKpis,
            getUserPopulation,
        });

        const overview = await service({ at: AT });

        expect(overview.availableSections.users).toBe(false);
        expect(overview.kpis).toEqual({});
        expect(overview).not.toHaveProperty('users');
    });
});
