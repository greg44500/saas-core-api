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

describe('platformOverviewDashboard.service', () => {
    it('partage le même instant puis compose les KPI économiques et la population utilisateurs avant projection', async () => {
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
        const getUserPopulation = vi.fn(async () => ({
            withCurrentClientAccess: 8,
        }));
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
        expect(getUserPopulation).toHaveBeenCalledWith();
        expect(projectOverview).toHaveBeenCalledWith({
            overview: {
                generatedAt: AT,
                kpis: {
                    users: { total: 12 },
                    workspaces: { total: 6 },
                    paidActiveSubscriptions: 2,
                    freeActiveAccesses: {
                        total: 4,
                        viaCommercialInvitation: 1,
                    },
                    activeTrials: 0,
                },
                users: {
                    byStatus: { active: 12 },
                    population: {
                        total: 12,
                        withCurrentClientAccess: 8,
                        withoutCurrentClientAccess: 4,
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
        expect(overview.attention.items).toHaveLength(1);
    });

    it('borne la population client au total de comptes pour éviter une incohérence analytique', async () => {
        const service = createPlatformOverviewDashboardService({
            getOverview: vi.fn(async () => ({
                generatedAt: AT,
                kpis: { users: { total: 3 } },
                users: { byStatus: { active: 3 } },
                attention: { counts: {} },
            })),
            getAttention: vi.fn(async () => []),
            getEconomicKpis: vi.fn(async () => ({})),
            getUserPopulation: vi.fn(async () => ({
                withCurrentClientAccess: 5,
            })),
            projectOverview: vi.fn(({ overview }) => overview),
        });

        const overview = await service({ at: AT });

        expect(overview.users.population).toEqual({
            total: 3,
            withCurrentClientAccess: 3,
            withoutCurrentClientAccess: 0,
        });
    });

    it('est fail-closed si aucune permission runtime n’est transmise', async () => {
        const getOverview = vi.fn(async () => ({
            generatedAt: AT,
            period: {},
            kpis: { users: { total: 10 } },
            users: { byStatus: { active: 10 } },
            attention: { counts: {} },
        }));
        const getAttention = vi.fn(async () => []);
        const getEconomicKpis = vi.fn(async () => ({
            paidActiveSubscriptions: 1,
            freeActiveAccesses: { total: 2, viaCommercialInvitation: 1 },
            activeTrials: 0,
        }));
        const getUserPopulation = vi.fn(async () => ({
            withCurrentClientAccess: 8,
        }));
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