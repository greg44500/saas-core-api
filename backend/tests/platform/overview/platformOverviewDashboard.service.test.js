import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    createPlatformOverviewDashboardService,
} from '../../../modules/platform/overview/platformOverviewDashboard.service.js';

const AT = new Date('2026-09-03T12:00:00.000Z');
const FROM = new Date('2026-08-03T12:00:00.000Z');
const TO = new Date('2026-09-03T12:00:00.000Z');

describe('platformOverviewDashboard.service', () => {
    it('partage le même instant entre synthèse et tableau détaillé', async () => {
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
        const service = createPlatformOverviewDashboardService({
            getOverview,
            getAttention,
        });

        const overview = await service({
            from: FROM,
            to: TO,
            at: AT,
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
        expect(overview.attention).toEqual({
            totalSignals: 3,
            counts: { failedAuditEvents: 3 },
            items: [
                {
                    id: 'audit_failed:audit-1',
                    type: 'audit_failed',
                    level: 'warning',
                },
            ],
        });
    });
});
