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
    it('partage le même instant puis applique la projection avec les permissions runtime', async () => {
        const getOverview = vi.fn(async () => ({
            generatedAt: AT,
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
        const projectOverview = vi.fn(({ overview }) => overview);
        const service = createPlatformOverviewDashboardService({
            getOverview,
            getAttention,
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
        expect(projectOverview).toHaveBeenCalledWith({
            overview: {
                generatedAt: AT,
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

    it('est fail-closed si aucune permission runtime n’est transmise', async () => {
        const getOverview = vi.fn(async () => ({
            generatedAt: AT,
            period: {},
            kpis: { users: { total: 10 } },
            users: { byStatus: { active: 10 } },
            attention: { counts: {} },
        }));
        const getAttention = vi.fn(async () => []);
        const service = createPlatformOverviewDashboardService({
            getOverview,
            getAttention,
        });

        const overview = await service({ at: AT });

        expect(overview.availableSections.users).toBe(false);
        expect(overview.kpis).toEqual({});
        expect(overview).not.toHaveProperty('users');
    });
});
